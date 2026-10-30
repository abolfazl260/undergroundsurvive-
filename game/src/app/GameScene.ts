import { contaminationState } from '../modules/radiation/radiation';
import { paintElevatorCars, paintElevatorShaft } from './elevatorArt';
import { ELEVATOR_DEFINITION } from '../modules/world/elevators';
import Phaser from 'phaser';
import type { MenuSettings } from './menuSettings';
import { getLocale, localizeGameMessage } from '../i18n';
import type { AudioCue } from '../modules/audio/AudioManager';
import { WORLD, toCell, toPixels, type GridPosition } from '../modules/world/grid';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../modules/building/catalog';
import { BuildingLayout } from '../modules/building/layout';
import { LEGACY_SURFACE_READ_ONLY_REASON } from '../modules/building/constructionPolicy';
import { findRoomPath, walkPoint } from '../modules/characters/pathfinding';
import type { ResidentTraffic } from '../modules/characters/traffic';
import { GameSession, type GameSnapshot, type UpgradeDetails } from '../modules/economy/session';
import type { PlacementResult } from '../modules/building/placement';
import { ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, LAB_WATER_ART_ASSET, LEVEL_TWO_ROOM_ART_ASSET, roomArtCandidates } from './roomArt';
import { SURVIVOR_ART, survivorGeometry, survivorFrame, hitSurvivor } from './survivorArt';
import { AssetManager } from './assets/assetManager';
import { RUINED_CITY_BACKGROUND, terrainOverlayOpacity } from './backgroundArt';
import { constrainScroll, GAME_VIEW, resizeViewport, panBy, screenToWorld, zoomAt, zoomToWorldAnchor, ZOOM, type Point, type Viewport } from './viewport';

type Contact = { x: number; y: number; startX: number; startY: number; dragged: boolean };
const localizedRoomBadges: Record<keyof typeof ROOM_DEFINITIONS, string> = {
  recreation:'تفریح', guardPost:'نگهبانی', command: 'فرمان', habitat: 'مسکونی', generator: 'برق', hydroponics: 'گلخانه',
  laboratory: 'آزمایشگاه', kitchen:'آشپزخانه', waterTreatment: 'تصفیه آب', ventilation: 'تهویه', medbay: 'درمانگاه', workshop: 'کارگاه', storage: 'انبار', mine: 'معدن'
};

export type ToolMode = 'elevator' | 'build' | 'dig' | 'move' | 'remove' | 'upgrade' | 'navigate';

export class GameScene extends Phaser.Scene {
  private readonly session: GameSession;
  private readonly assets = new AssetManager(
    [ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, RUINED_CITY_BACKGROUND, SURVIVOR_ART, LAB_WATER_ART_ASSET, LEVEL_TWO_ROOM_ART_ASSET], import.meta.env.BASE_URL,
    Math.min(4, ZOOM.max * Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))
  );
  private get layout(): BuildingLayout { return this.session.layout; }
  private selectedRoom: BuildableRoomType = 'habitat';
  private mode: ToolMode = 'build';
  private pendingMoveId: string | null = null;
  private selectedUpgradeId: string | null = null;
  private terrainLayer?: Phaser.GameObjects.Graphics;
  private elevatorCarLayer?: Phaser.GameObjects.Graphics;
  private roomLayer?: Phaser.GameObjects.Container;
  private roomBadges: Phaser.GameObjects.Container[] = [];
  private airBadges: {id: string; label: Phaser.GameObjects.Text}[] = [];
  private preview?: Phaser.GameObjects.Graphics;
  private radiationOverlay=false;
  private radiationSelection:GridPosition={x:12,y:-1};
  private radiationLayer?:Phaser.GameObjects.Graphics;
  private previewReason?: Phaser.GameObjects.Text;
  private readonly recoveryFailed: boolean;
  private hovered: GridPosition | null = null;
  private readonly contacts = new Map<number, Contact>();
  private pinch?: { initialDistance: number; initialZoom: number; worldAnchor: Point };
  private gestureUsed = false;
  private gameplayPaused = true;
  private sceneReady = false;
  private menuSettings: MenuSettings = { reducedMotion: false };
  private readonly residentFigures = new Map<string, {
    person: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Image;
    variant: number;
    lastX: number;
    ring: Phaser.GameObjects.Ellipse;
  }>();
  private residentPathLayer?: Phaser.GameObjects.Graphics;
  private traffic?: ResidentTraffic;
  private selectedResidentId = 'resident-1';
  private readonly residentWaitMs = new Map<string, number>();
  private readonly patrolCursors = new Map<string, number>();
  private viewportSize: { width: number; height: number } = {
    width: GAME_VIEW.width, height: GAME_VIEW.height
  };

  constructor(
    private readonly report: (snapshot: GameSnapshot, message: string) => void,
    saved: unknown,
    private readonly onZoomChange: (zoom: number) => void = () => {},
    private readonly onAudioCue: (cue: AudioCue) => void = () => {},
    private readonly onAudioActivate: () => void = () => {},
    private readonly onUpgradeSelection: (details: UpgradeDetails | null) => void = () => {},
    private readonly onCycleProgress: (remainingSeconds: number) => void = () => {}
  ) {
    super({ key: 'UndergroundScene' });
    this.recoveryFailed = saved != null && !GameSession.restore(saved) && !BuildingLayout.restore(saved);
    this.session = GameSession.fromSave(saved);
  }

  preload(): void {
    this.assets.preload(this.load, this.textures);
  }

  create(): void {
    this.assets.configureFilters(
      this.textures, Phaser.Textures.FilterMode.LINEAR, Phaser.Textures.FilterMode.NEAREST
    );
    // The visual window is portrait; the map and every stored grid coordinate stay unchanged.
    this.cameras.main.setScroll(
      (GAME_VIEW.worldWidth - this.cameras.main.width) / 2,
      (GAME_VIEW.worldHeight - this.cameras.main.height) / 2
    );
    this.viewportSize = { width: this.cameras.main.width, height: this.cameras.main.height };
    // RESIZE keeps the camera centered on the same world location on rotation.
    const resizeView = (size: Phaser.Structs.Size): void => {
      if (size.width <= 0 || size.height <= 0) return;
      const camera = this.cameras.main;
      const previous = { ...this.currentView(), ...this.viewportSize };
      camera.setSize(size.width, size.height);
      this.viewportSize = { width: size.width, height: size.height };
      this.applyView(resizeViewport(previous, size.width, size.height));
    };
    this.scale.on('resize', resizeView);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resizeView));
    this.drawBackdrop();
    this.terrainLayer = this.add.graphics().setDepth(1);
    this.elevatorCarLayer = this.add.graphics().setDepth(3.8);
    this.radiationLayer=this.add.graphics().setDepth(5);
    this.roomLayer = this.add.container(0, 0).setDepth(3);
    this.residentPathLayer = this.add.graphics().setDepth(3.5);
    this.preview = this.add.graphics().setDepth(6);
    this.paintTerrain();
    this.paintRooms();
    this.addResident();
    this.sceneReady = true;
    this.applyMenuSettings(this.menuSettings);

    this.input.addPointer(2); // Accept simultaneous touch contacts for pinch gestures.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onAudioActivate(); // Unlock Web Audio during a touch/mouse gesture.
      this.startContact(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveContact(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endContact(pointer, false));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.endContact(pointer, true));
    this.input.on('gameout', () => {
      this.hovered = null;
      this.paintPreview();
    });
    this.input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      _over: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
      _dz: number,
      event: WheelEvent
    ) => {
      event.preventDefault();
      if (dy !== 0) this.setZoomAt(this.cameras.main.zoom + (dy < 0 ? 0.15 : -0.15), { x: pointer.x, y: pointer.y });
    });
    this.onZoomChange(this.cameras.main.zoom);
    this.onCycleProgress(Math.ceil(this.session.resources.remainingMs / 1000));
    if(this.recoveryFailed) this.notify('ذخیره قابل بازیابی نیست؛ نسخهٔ اصلی برای بازیابی نگهداری شد.');
    else if (this.layout.disconnectedRoomIds.length)
      this.notify('ذخیرهٔ قدیمی دارای اتاق‌های جداافتاده است؛ اتاق‌ها حفظ شده‌اند. برای اصلاح، آن‌ها را به شبکهٔ آسانسور منتقل کنید.');
    else this.notify('ابزار ساخت را انتخاب کنید؛ با اسکرول یا دو انگشت زوم کنید و با کشیدن، نقشه را جابه‌جا کنید.');
    if (this.gameplayPaused) this.scene.pause();
  }

  /** Pause scene updates, resident animations and world interactions. */
  pauseGameplay(): void {
    this.gameplayPaused = true;
    this.contacts.clear();
    this.pinch = undefined;
    this.gestureUsed = false;
    this.hovered = null;
    this.paintPreview();
    if (this.sceneReady && this.scene.isActive()) this.scene.pause();
  }

  resumeGameplay(): void {
    this.gameplayPaused = false;
    if (this.sceneReady && this.scene.isPaused()) this.scene.resume();
  }

  applyMenuSettings(settings: MenuSettings): void {
    this.menuSettings = { ...settings };
    this.session.survivors.setReducedMotion(settings.reducedMotion);
    // Reduced motion resolves one reserved edge per update rather than
    // teleporting residents through other bodies or solid terrain.
    this.syncResidents();
  }

  private lastCycleCountdown = -1;

  update(_time: number, delta: number): void {
    if (this.gameplayPaused) return;
    this.session.setRadiationOccupants((this.traffic?.residents??[]).map(r=>({id:r.id,x:r.cell.x,y:r.cell.y,protection:0})));
    const researchBefore=this.session.research.snapshot().activeResearchId;
    const completed = this.session.advanceTime(delta);
    const seconds = Math.ceil(this.session.resources.remainingMs / 1000);
    if (seconds !== this.lastCycleCountdown) {
      this.lastCycleCountdown = seconds;
      this.onCycleProgress(seconds);
    }
    if (completed > 0) {
      this.updateAirBadges();
      this.paintRadiation();
      if (this.layout.rooms.some(r=>r.type==='kitchen')) this.paintRooms();
      const result = this.session.resources.snapshot();
      this.notify(researchBefore && !this.session.research.snapshot().activeResearchId ? 'پژوهش تکمیل شد.' : result.lastShortages.length
        ? 'چرخهٔ منابع انجام شد؛ برخی اتاق‌ها به‌علت کمبود منابع متوقف شدند.'
        : 'چرخهٔ تولید و مصرف منابع انجام شد.');
    }
    if (!this.traffic) return;
    const arrivals: string[] = [];
    this.syncResidents();
    this.paintElevatorMotion();
    this.paintResidentPath();
    for (const resident of this.traffic.residents) {
      if (resident.isMoving || this.session.survivors.assignment(resident.id)) continue;
      if (arrivals.includes(resident.id)) this.residentWaitMs.set(resident.id, 1800);
      const remaining = (this.residentWaitMs.get(resident.id) ?? 1400) -
        Math.max(0, Math.min(delta, 1000));
      this.residentWaitMs.set(resident.id, remaining);
      if (remaining <= 0) this.patrolResident(resident.id);
    }
  }

  /** Repaint translated nameplates without changing any gameplay state. */
  refreshLanguage(): void {
    if (this.sceneReady) this.paintRooms();
  }

  /** Exposed to the responsive HTML zoom controls. */
  zoomBy(amount: number): void {
    this.setZoomAt(this.cameras.main.zoom + amount, {
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2
    });
  }

  resetZoom(): void {
    const view = this.currentView();
    const centered = {
      ...view, zoom: ZOOM.initial,
      scrollX: (GAME_VIEW.worldWidth - view.width) / 2,
      scrollY: (GAME_VIEW.worldHeight - view.height) / 2
    };
    this.applyView({ ...centered, ...constrainScroll(centered) });
  }

  private currentView(): Viewport {
    const camera = this.cameras.main;
    return {
      width: camera.width, height: camera.height,
      worldWidth: GAME_VIEW.worldWidth, worldHeight: GAME_VIEW.worldHeight,
      zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY
    };
  }

  private applyView(view: Viewport): void {
    const camera = this.cameras.main;
    const changedZoom = camera.zoom !== view.zoom;
    camera.setZoom(view.zoom);
    camera.setScroll(view.scrollX, view.scrollY);
    if (changedZoom) {
      this.updateBadgeScale();
      this.onZoomChange(view.zoom);
    }
    if (this.contacts.size === 0) this.updateHover(this.input.activePointer);
    else {
      this.hovered = null;
      this.paintPreview();
    }
  }

  private setZoomAt(zoom: number, screen: Point): void {
    this.applyView(zoomAt(this.currentView(), zoom, screen));
  }

  private pointToCell(screen: Point): GridPosition | null {
    const world = screenToWorld(this.currentView(), screen);
    return toCell(world.x, world.y);
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    this.hovered = this.pointToCell({ x: pointer.x, y: pointer.y });
    this.paintPreview();
  }

  private startContact(pointer: Phaser.Input.Pointer): void {
    this.contacts.set(pointer.id, {
      x: pointer.x, y: pointer.y,
      startX: pointer.x, startY: pointer.y,
      dragged: false
    });
    if (this.contacts.size >= 2) {
      this.gestureUsed = true;
      this.beginPinch();
      this.hovered = null;
      this.paintPreview();
    }
  }

  private beginPinch(): void {
    const [first, second] = [...this.contacts.values()];
    if (!first || !second) return;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    this.pinch = {
      initialDistance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
      initialZoom: this.cameras.main.zoom,
      worldAnchor: screenToWorld(this.currentView(), midpoint)
    };
  }

  private moveContact(pointer: Phaser.Input.Pointer): void {
    const contact = this.contacts.get(pointer.id);
    if (!contact) {
      if (this.contacts.size === 0) this.updateHover(pointer);
      return;
    }
    const dx = pointer.x - contact.x;
    const dy = pointer.y - contact.y;
    contact.x = pointer.x;
    contact.y = pointer.y;

    if (this.contacts.size >= 2) {
      if (!this.pinch) this.beginPinch();
      const [a, b] = [...this.contacts.values()];
      if (!a || !b || !this.pinch) return;
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const targetZoom = this.pinch.initialZoom * distance / this.pinch.initialDistance;
      this.applyView(zoomToWorldAnchor(this.currentView(), targetZoom, this.pinch.worldAnchor, midpoint));
      return;
    }

    if (Math.hypot(contact.x - contact.startX, contact.y - contact.startY) > 14) {
      contact.dragged = true;
    }
    if (contact.dragged || this.gestureUsed) {
      this.applyView(panBy(this.currentView(), { x: dx, y: dy }));
      return;
    }
    this.updateHover(pointer);
  }

  private endContact(pointer: Phaser.Input.Pointer, outside: boolean): void {
    const contact = this.contacts.get(pointer.id);
    if (!contact) return;
    this.contacts.delete(pointer.id);
    if (this.contacts.size < 2) this.pinch = undefined;
    const shouldAct = !outside && !this.gestureUsed && !contact.dragged && pointer.button === 0;
    if (this.contacts.size === 0) this.gestureUsed = false;
    if (shouldAct) {
      const screen = { x: pointer.x, y: pointer.y };
      const cell = this.pointToCell(screen);
      if (cell) this.actOnCell(cell, screenToWorld(this.currentView(), screen));
    }
    if (this.contacts.size === 0 && !outside) this.updateHover(pointer);
    else {
      this.hovered = null;
      this.paintPreview();
    }
  }

  selectRoom(type: BuildableRoomType): void {
    this.selectedRoom = type;
    this.setTool('build');
  }

  setTool(tool: ToolMode): void {
    this.radiationOverlay=false;this.paintRadiation();
    this.mode = tool;
    this.pendingMoveId = null;
    this.selectedUpgradeId = null;
    this.onUpgradeSelection(null);
    this.syncResidents();
    this.paintPreview();
    const messages: Record<ToolMode, string> = {
      elevator: 'آسانسور را در خانهٔ مجاور شفت امتداد دهید.',
      build: 'جایگاه‌های سبز کنار آسانسور یا اتاق‌های متصل را برای ساخت انتخاب کنید.',
      dig: 'برای حفاری روی زمین بستهٔ زیرزمینی مجاور فضای باز بزنید.',
      move: 'ابتدا اتاق را انتخاب کنید و سپس مکان جدید آن را لمس کنید.',
      remove: 'برای تخریب روی اتاق کلیک کنید. مجوزهای کسب‌شده حفظ می‌شوند.',
      upgrade: 'اتاق را انتخاب کنید، جزئیات ارتقا را ببینید و سپس پرداخت را تأیید کنید.',
      navigate: 'ابتدا آدمک را لمس کنید، سپس اتاق مقصد را انتخاب کنید. مسیر فقط از زمین قابل‌عبور می‌گذرد.'
    };
    this.onAudioCue('select');
    this.notify(messages[tool]);
  }

  unlockFloor(): void {
    const cost = this.session.floorCost();
    const result = this.session.unlockFloor();
    if (result.ok) {
      this.paintTerrain();
      this.refreshResidentPath();
    }
    this.onAudioCue(result.ok ? 'floor' : 'error');
    this.paintPreview();
    this.notify(result.ok ? 'طبقهٔ جدید با پرداخت ' + cost + ' سکه آزاد شد؛ برای ساخت تکیه‌گاه لازم است.' : result.reason);
  }

  assignSurvivor(id:string,roomId:string):void {
    if(this.gameplayPaused)return;
    const room=this.layout.rooms.find(r=>r.id===roomId);
    const block=room?.type==='laboratory'?this.session.assignScientist(id,roomId,crypto.randomUUID()):room?.type==='recreation'?this.session.assignRecreation(id,roomId,crypto.randomUUID()):null;
    const reason=room?.type==='laboratory'||room?.type==='recreation'?(block?({survivor:'بازمانده وجود ندارد.',room:'اتاق معتبر نیست.',busy:'نیرو شغل دیگری دارد؛ ابتدا آزاد کنید.',capacity:'ظرفیت اتاق پر است.',path:'مسیر قابل‌عبور نیست.',duplicate:'درخواست تکراری است.',satisfied:'روحیه کامل است.',power:'برق کافی نیست.'}[block]):null):room?.type==='kitchen'?this.session.assignCook(id,roomId,crypto.randomUUID()):this.session.assignGuard(id,roomId,crypto.randomUUID());
    this.syncResidents();this.notify(reason??'تخصیص انجام شد؛ نیرو در مسیر است.');
  }
  releaseSurvivor(id:string):void {
    if(this.gameplayPaused)return;
    this.session.survivors.release(id);this.notify('نیرو آزاد شد.');
  }
  commandPopulation():number{return this.traffic?.residents.length??0;}
  upgradeCommandCenter():void {
    if(this.gameplayPaused)return;
    const id=this.session.commandStatus().activeRoomId;
    const result=id?this.session.upgradeRoom(id,crypto.randomUUID()):{ok:false as const,reason:'اتاق فرماندهی فعال لازم است.'};
    if(result.ok)this.paintRooms();this.notify(result.ok?'فرماندهی ارتقا یافت.':result.reason);
  }
  toggleRadiation():void {this.radiationOverlay=!this.radiationOverlay;this.paintRadiation();}
  radiationView() {return {enabled:this.radiationOverlay,cell:{...this.radiationSelection}};}
  cleanupRadiation():void {
    if(this.gameplayPaused)return;
    const {x,y}=this.radiationSelection;
    const ok=this.session.cleanupRadiation(x,y,crypto.randomUUID());this.paintRadiation();this.notify(ok?'پاکسازی انجام شد.':'پاکسازی ممکن نیست؛ موجودی را بررسی کنید.');
  }
  filterRadiation():void {
    if(this.gameplayPaused)return;
    const r=this.layout.getRoomAt(this.radiationSelection.x,this.radiationSelection.y);
    const ok=r&&this.session.installRadiationFilter(r.id,crypto.randomUUID());this.paintRadiation();this.notify(ok?'فیلتر نصب شد.':'ابتدا اتاق بدون فیلتر انتخاب کنید و موجودی را بررسی کنید.');
  }
  private paintRadiation():void {
    const g=this.radiationLayer;if(!g)return;g.clear();if(!this.radiationOverlay)return;
    const colors={low:0x43c9a5,medium:0xffbf55,high:0xf35572};
    for(let y:number=WORLD.minY;y<=WORLD.maxY;y++)for(let x=0;x<WORLD.cols;x++) {
      const {left,top}=toPixels(x,y),risk=this.session.radiation.getRiskForLocation(x,y);
      g.fillStyle(colors[contaminationState(risk)],0.28).fillRect(left+1,top+1,WORLD.cellSize-2,WORLD.cellSize-2);
    }
    const p=toPixels(this.radiationSelection.x,this.radiationSelection.y);g.lineStyle(3,0xffffff).strokeRect(p.left+2,p.top+2,50,50);
  }
  startResearch(id:string):void {
    if(this.gameplayPaused)return;
    const ok=this.session.startResearch(id,crypto.randomUUID());
    this.notify(ok ? 'پژوهش آغاز شد.' : 'پژوهش قابل شروع نیست؛ پیش‌نیازها را بررسی کنید.');
  }
  startCooking(roomId: string, recipeId: string): void {
    if (this.gameplayPaused) return;
    const reason = this.session.startCooking(roomId, recipeId, crypto.randomUUID());
    this.paintRooms(); this.notify(reason ? 'شروع پخت ممکن نیست: ' + reason : 'پخت جیره آغاز شد.');
  }
  toggleCooking(roomId: string): void {
    if (this.gameplayPaused) return;
    this.session.toggleCooking(roomId);
    this.paintRooms(); this.notify('وضعیت پخت تغییر کرد.');
  }
  cancelCooking(roomId: string): void {
    if (this.gameplayPaused) return;
    this.session.cancelCooking(roomId);
    this.paintRooms(); this.notify('پخت لغو شد؛ مواد مصرف‌شده بازگردانده نمی‌شوند.');
  }
  collectWater(): void {
    if (this.gameplayPaused) return;
    const ok = this.session.collectWater(crypto.randomUUID());
    this.notify(ok ? 'آب خام برداشت شد.' : 'برداشت ممکن نیست؛ برق، فضای مخزن و ذخیرهٔ چاه را بررسی کنید.');
  }
  toggleWater(id: string): void {
    if (this.gameplayPaused) return;
    this.session.toggleWater(id); this.notify('تصفیه آب');
  }
  toggleVent(id: string): void {
    if (this.gameplayPaused) return;
    const ok = this.session.toggleVent(id, crypto.randomUUID());
    this.updateAirBadges();
    this.notify(ok ? 'وضعیت تهویه تغییر کرد.' : 'تغییر وضعیت تهویه ممکن نیست.');
  }
  repairVent(id: string): void {
    if (this.gameplayPaused) return;
    const ok = this.session.repairVent(id, crypto.randomUUID());
    this.updateAirBadges();
    this.notify(ok ? 'تجهیزات تهویه تعمیر شد.' : 'تعمیر تهویه ممکن نیست؛ موجودی را بررسی کنید.');
  }
  claimDemoBonus(): void {
    const result = this.session.claimDemoBonus();
    this.onAudioCue(result.ok ? 'reward' : 'error');
    this.paintPreview();
    this.notify(result.ok ? '۵۰۰ سکهٔ کمک‌هزینهٔ آزمایشی دریافت شد.' : result.reason);
  }

  resetLayout(): void {
    this.session.reset();
    this.lastCycleCountdown = -1;
    this.onCycleProgress(5);
    this.onAudioCue('reset');
    this.pendingMoveId = null;
    this.selectedUpgradeId = null;
    this.onUpgradeSelection(null);
    this.paintTerrain();
    this.paintRadiation();
    this.paintRooms();
    this.resetResident();
    this.paintPreview();
    this.notify('نقشه، حفاری‌ها و طبقات به وضعیت اولیه بازگردانده شدند.');
  }

  /** Commit a selected upgrade only after the explicit confirmation button is used. */
  upgradeSelected(): void {
    if (this.gameplayPaused || this.mode !== 'upgrade' || !this.selectedUpgradeId) {
      this.onAudioCue('error');
      this.notify('ابتدا در حالت ارتقا یک اتاق را انتخاب کنید.');
      return;
    }
    const id = this.selectedUpgradeId;
    const details = this.session.upgradeDetails(id);
    if (!details || details.cost === null) {
      this.onUpgradeSelection(details);
      this.onAudioCue('error');
      this.notify(details ? details.blockedReason ?? 'این اتاق در بالاترین سطح قرار دارد.' : 'اتاق انتخاب‌شده وجود ندارد.');
      return;
    }
    const result = this.session.upgradeRoom(id,crypto.randomUUID());
    if (result.ok) this.paintRooms();
    this.onUpgradeSelection(this.session.upgradeDetails(id));
    this.paintPreview();
    this.onAudioCue(result.ok ? 'upgrade' : 'error');
    this.notify(result.ok
      ? 'اتاق ' + details.label + ' با هزینهٔ ' + details.cost + ' سکه ارتقا یافت.'
      : result.reason);
  }

  private actOnCell(cell: GridPosition, worldPoint?: Point): void {
    if (this.gameplayPaused) return;
    const { x, y } = cell;
    if(this.radiationOverlay) {
      this.radiationSelection={x,y};this.paintRadiation();this.notify('منطقهٔ تشعشع انتخاب شد.');return;
    }
    if (this.mode === 'elevator') {
      const result=this.session.buildElevator(x,y);
      if(result.ok) { this.paintTerrain(); this.refreshResidentPath(); }
      this.hovered = cell;
      this.paintPreview();
      this.notify(result.ok ? 'آسانسور ساخته و طبقه آزاد شد.' : result.reason); return;
    }
    if (this.mode === 'navigate') {
      // Tap a character to select it, then tap a room to direct that resident.
      // Use rendered positions, not only grid origins, for moving characters.
      const selected = worldPoint && this.traffic?.residents.find((resident) =>
        hitSurvivor(resident.position, worldPoint, this.cameras.main.zoom)
      );
      if (selected) {
        this.selectedResidentId = selected.id;
        this.syncResidents();
        this.paintResidentPath();
        this.onAudioCue('select');
        this.notify('آدمک ' + selected.id.replace('resident-', '') + ' انتخاب شد؛ اتاق مقصد را لمس کنید.');
        return;
      }
      const room = this.layout.getRoomAt(x, y);
      if (!room || !this.beginResidentWalk(this.selectedResidentId, room.id, true)) {
        this.onAudioCue('error');
        this.notify(room ? 'مسیر قابل‌عبوری به این اتاق وجود ندارد.' : 'ابتدا یک اتاق مقصد انتخاب کنید.');
        return;
      }
      this.onAudioCue('select');
      this.notify('مقصد آدمک انتخاب‌شده: ' + ROOM_DEFINITIONS[room.type].label + '.');
      return;
    }
    if (this.mode === 'upgrade') {
      const room = this.layout.getRoomAt(x, y);
      this.selectedUpgradeId = room?.id ?? null;
      const preview = room ? this.session.upgradeDetails(room.id) : null;
      this.onUpgradeSelection(preview);
      this.hovered = cell;
      this.paintPreview();
      this.onAudioCue(preview ? 'select' : 'error');
      this.notify(!preview ? 'در این موقعیت اتاقی وجود ندارد.' :
        room && !this.layout.canEditRoom(room) ? LEGACY_SURFACE_READ_ONLY_REASON :
        preview.cost === null ? 'این اتاق در بالاترین سطح قرار دارد.' :
        'جزئیات ارتقا نمایش داده شد؛ با دکمهٔ تأیید پرداخت کنید.');
      return;
    }
    let result: PlacementResult = { ok: false, reason: 'دستور نامعتبر است.' };
    let successMessage = '';
    const cue: AudioCue = {
      build: 'build', dig: 'dig', move: 'move', remove: 'remove', upgrade: 'upgrade'
    }[this.mode] as AudioCue;
    if (this.mode === 'build') {
      const cost = this.session.buildCost(this.selectedRoom);
      result = this.session.build(this.selectedRoom, x, y);
      successMessage = 'اتاق ساخته شد. هزینه: ' + cost + ' سکه.';
    } else if (this.mode === 'dig') {
      const cost = this.session.digCost();
      result = this.session.dig(x, y);
      successMessage = 'حفاری با هزینهٔ ' + cost + ' سکه انجام شد.';
    } else if (this.mode === 'move') {
      const room = this.layout.getRoomAt(x, y);
      if (!this.pendingMoveId) {
        if (!room || !this.layout.canEditRoom(room)) {
          this.onAudioCue('error');
          this.notify(room && !this.layout.canEditRoom(room) ? LEGACY_SURFACE_READ_ONLY_REASON :
            'برای جابه‌جایی ابتدا یک اتاق معمولی انتخاب کنید.');
          return;
        }
        this.pendingMoveId = room.id;
        this.onAudioCue('select');
        this.paintPreview();
        this.notify('اتاق انتخاب شد؛ روی محل جدید بزنید.');
        return;
      }
      if (room?.id === this.pendingMoveId) {
        this.pendingMoveId = null;
        this.onAudioCue('select');
        this.paintPreview();
        this.notify('انتخاب جابه‌جایی لغو شد.');
        return;
      }
      result = this.session.moveRoom(this.pendingMoveId, x, y);
      successMessage = 'اتاق به محل جدید منتقل شد.';
      if (result.ok) this.pendingMoveId = null;
    } else {
      const room = this.layout.getRoomAt(x, y);
      if (!room) {
        this.onAudioCue('error');
        this.notify('در این موقعیت اتاقی وجود ندارد.');
        return;
      }
      result = this.session.removeRoom(room.id);
      successMessage = 'اتاق تخریب شد.';
    }
    if (result.ok) {
      this.paintTerrain();
      this.paintRooms();
      this.refreshResidentPath();
    }
    this.hovered = cell;
    this.paintPreview();
    this.onAudioCue(result.ok ? cue : 'error');
    this.notify(result.ok ? successMessage : result.reason);
  }

  private notify(message: string): void {
    this.report(this.session.snapshot(), message);
  }

  private drawBackdrop(): void {
    // Keep an oversized solid fallback behind the artwork for panning, zooming
    // out, or a failed texture request. The artwork itself maps 1:1 onto the
    // 960×600 world, even though the mobile-first viewing window is portrait.
    const fallback = this.add.graphics().setDepth(-1);
    fallback.fillStyle(0x211f2a).fillRect(-600, -400, 2160, WORLD.groundLineY + 400);
    fallback.fillStyle(0x33271e).fillRect(-600, WORLD.groundLineY, 2160, 1000);

    const background = this.assets.resolve(RUINED_CITY_BACKGROUND.key, this.textures);
    if (background) {
      this.add.image(0, 0, background.key)
        .setOrigin(0, 0)
        .setDisplaySize(GAME_VIEW.worldWidth, GAME_VIEW.worldHeight)
        .setDepth(0);
    }
    this.add.text(20, 20, 'SURFACE / CONSTRUCTION LOCKED', { fontSize: '13px', color: '#e2e5ed' }).setDepth(2);
    this.add.text(20, 566, 'UNDERGROUND / EXCAVATE BELOW', { fontSize: '13px', color: '#cbb7a0' }).setDepth(2);
  }

  private paintTerrain(): void {
    if (!this.terrainLayer) return;
    const g = this.terrainLayer;
    g.clear();
    for (let y: number = WORLD.minY; y <= WORLD.maxY; y++) {
      for (let x = 0; x < WORLD.cols; x++) {
        const { left, top } = toPixels(x, y);
        const open = this.layout.terrain.isOpen(x, y);
        const color = y < 0 ? (open ? 0x1a3441 : ((x + y) % 2 ? 0x504136 : 0x493a31)) :
          y === 0 ? 0x2a4751 : open ? 0x263f50 : 0x172634;
        g.fillStyle(color, terrainOverlayOpacity(y, open));
        g.fillRect(left + 1, top + 1, WORLD.cellSize - 2, WORLD.cellSize - 2);
        if (!open && y < 0) {
          g.lineStyle(1, 0x8c7359, 0.26);
          g.lineBetween(left + 12, top + 18, left + 28, top + 33);
        } else if (y < 0) {
          g.fillStyle(0x4f8b8a, 0.19).fillRect(left + 4, top + 4, WORLD.cellSize - 8, 4);
        }
        g.lineStyle(1, 0x91b0ae, 0.18);
        g.strokeRect(left, top, WORLD.cellSize, WORLD.cellSize);
      }
    }
    paintElevatorShaft(g, this.layout.terrain.elevators);
    this.paintElevatorMotion();
  }

  private paintRooms(): void {
    if (!this.roomLayer) return;
    this.roomLayer.removeAll(true);
    this.roomBadges = [];
    this.airBadges = [];
    for (const room of this.layout.rooms) {
      const definition = ROOM_DEFINITIONS[room.type];
      const { left, top } = toPixels(room.x, room.y);
      const width = room.width * WORLD.cellSize - 4;
      const height = room.height * WORLD.cellSize - 4;
      // Level 2 receives its own illustrated interior; missing assets safely
      // fall back to the original Level 1 sheet (or basic room graphics).
      const texture = roomArtCandidates(room.type, room.level)
        .map(({ key, frame }) => this.assets.resolve(key, this.textures, frame))
        .find((resolved) => resolved !== null) ?? null;
      if (texture) {
        const sprite = this.add.image(left + 2, top + 2, texture.key, texture.frame)
          .setOrigin(0, 0)
          .setDisplaySize(width, height);
        this.roomLayer.add(sprite);
      }

      const graphics = this.add.graphics();
      if (!texture) {
        // Keep legacy room types and failed asset requests playable.
        graphics.fillStyle(definition.color).fillRoundedRect(left + 2, top + 2, width, height, 4);
        graphics.fillStyle(definition.accent, 0.21).fillRect(left + 10, top + 9, width - 16, 8);
        if (room.type === 'ventilation') {
          const cx = left + width / 2, cy = top + height / 2 + 3;
          graphics.lineStyle(2, 0xbafbf2, 0.85).strokeCircle(cx, cy, 13);
          graphics.fillStyle(0x0b2932, 0.9).fillCircle(cx, cy, 3);
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI * 2 / 3) {
            graphics.fillStyle(0x7fe6d5, 0.65).fillEllipse(cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7, 11, 5);
          }
        }
      }
      graphics.lineStyle(1.5 + (room.level - 1) * 0.6, definition.accent, 0.9)
        .strokeRoundedRect(left + 2, top + 2, width, height, 4);
      this.roomLayer.add(graphics);

      // At high zoom, keep the nameplate at its original screen size so it
      // does not obscure the newly detailed artwork. Text textures render at
      // 3× resolution instead of stretching a tiny 9px bitmap.
      const badgeWidth = width - 8;
      const badge = this.add.container(left + 6, top + 3);
      const plate = this.add.graphics();
      plate.fillStyle(0x09131f, 0.82).fillRoundedRect(0, 0, badgeWidth, 14, 3);
      const name = this.add.text(4, 1, getLocale() === 'fa' ? localizedRoomBadges[room.type] : definition.label, {
        fontSize: '9px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', fontStyle: 'bold', color: '#f4f7fa'
      }).setResolution(3);
      const level = this.add.text(badgeWidth - 4, 1, 'LV ' + room.level, {
        fontSize: '9px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', color: room.level > 1 ? '#ffe2a1' : '#e0e5eb'
      }).setOrigin(1, 0).setResolution(3);
      badge.add([plate, name, level]);
      this.roomBadges.push(badge);
      this.roomLayer.add(badge);
      if (room.type === 'ventilation') {
        const airLabel = this.add.text(left + 7, top + height - 14, '', {
          fontSize: '10px', color: '#a8fff0', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', fontStyle: 'bold',
          backgroundColor: '#09202bd9', padding: {x:3,y:1},
        }).setResolution(3);
        this.airBadges.push({id: room.id, label: airLabel});
        this.roomLayer.add(airLabel);
      }
      if (room.type === 'kitchen') {
        const cycle = this.session.kitchen.snapshot().cycles.find(c => c.roomId === room.id);
        if (cycle && cycle.status !== 'idle') {
          const pct = cycle.durationMs ? Math.round(100 * cycle.elapsedMs / cycle.durationMs) : 100;
          const cooking = this.add.text(left + 8, top + height - 14,
            (cycle.status === 'completed' ? '✓' : cycle.status === 'running' ? '♨' : 'Ⅱ') + ' ' + pct + '%',
            { fontSize: '10px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', color: '#fff5d5', backgroundColor: '#222222aa' }).setResolution(3);
          this.roomLayer.add(cooking);
        }
      }
    }
    this.updateBadgeScale();
    this.updateAirBadges();
  }

  private updateAirBadges(): void {
    if (!this.airBadges.length) return;
    const vents = this.session.air.snapshot().vents;
    const en = getLocale() === 'en';
    for (const badge of this.airBadges) {
      const state = vents.find(vent => vent.id === badge.id);
      const active = !!state?.powered && !!state.enabled && state.health > 0;
      badge.label.setText(active ? (en ? 'ACTIVE' : 'فعال')
        : !state?.enabled ? (en ? 'OFF' : 'خاموش') :
          !state || state.health <= 0 ? (en ? 'BROKEN' : 'خراب') : (en ? 'NO POWER' : 'بدون برق'));
      badge.label.setColor(active ? '#a8fff0' : '#ffca88');
    }
  }

  private updateBadgeScale(): void {
    // Only counteract magnification; labels stay attached to their rooms.
    // Below 100% the room is too narrow for a full-size badge.
    const scale = 1 / Math.max(1, this.cameras.main.zoom);
    for (const badge of this.roomBadges) badge.setScale(scale);
  }

  private addResident(): void {
    for (const figure of this.residentFigures.values()) figure.person.destroy();
    this.residentFigures.clear();
    this.traffic = this.session.survivors.traffic;
    this.selectedResidentId = this.traffic.residents[0]?.id ?? '';
    this.residentWaitMs.clear();
    this.patrolCursors.clear();
    this.traffic.residents.forEach((resident, index) => {
      const person = this.add.container(resident.position.x, resident.position.y).setDepth(4);
      const geometry = survivorGeometry();
      const ring = this.add.ellipse(0, geometry.feetOffset, 15, 4, 0xffe29a, 0.25);
      const texture = this.assets.resolve(SURVIVOR_ART.key, this.textures, index * 6);
      // The loader always bundles the atlas; a missing animation uses its idle frame.
      const sprite = this.add.image(0, geometry.feetOffset, texture?.key ?? '__MISSING', texture?.frame)
        .setOrigin(0.5, 1).setDisplaySize(geometry.width, geometry.height);
      person.add([ring, sprite]);
      this.residentFigures.set(resident.id, { person, sprite, variant: index, lastX: resident.position.x, ring });
      this.residentWaitMs.set(resident.id, 1400 + index * 650);
      this.patrolCursors.set(resident.id, index);
    });
    this.syncResidents();
    this.paintElevatorMotion();
    this.paintResidentPath();
  }

  private resetResident(): void {
    this.addResident();
  }

  private syncResidents(): void {
    for (const resident of this.traffic?.residents ?? []) {
      const figure = this.residentFigures.get(resident.id);
      if (!figure) continue;
      figure.person.setPosition(resident.position.x, resident.position.y);
      const phase = resident.elevator;
      figure.person.setVisible(phase !== 'closing' && phase !== 'travel' && phase !== 'arrival-opening');
      figure.person.setAlpha(phase === 'boarding' ? 0.6 : 1);
      figure.ring.setVisible(this.mode === 'navigate' && resident.id === this.selectedResidentId);
      if (Math.abs(resident.position.x - figure.lastX) > 0.01)
        figure.sprite.setFlipX(resident.position.x < figure.lastX);
      figure.lastX = resident.position.x;
      const room = this.layout.getRoomAt(resident.cell.x, resident.cell.y);
      const state = resident.isWalking ? 'walk' : !resident.isWaiting && room &&
        room.type !== 'habitat' && room.type !== 'command' && room.type !== 'recreation' ? 'work' : 'idle';
      const frame = survivorFrame(figure.variant, state, this.time.now, this.menuSettings.reducedMotion);
      const texture = this.assets.resolve(SURVIVOR_ART.key, this.textures, frame)
        ?? this.assets.resolve(SURVIVOR_ART.key, this.textures, figure.variant * 6);
      if (texture) figure.sprite.setTexture(texture.key, texture.frame);

    }
  }

  private paintElevatorMotion(): void {
    if (this.elevatorCarLayer) paintElevatorCars(this.elevatorCarLayer, this.traffic?.elevatorCars ?? []);
  }

  private paintResidentPath(): void {
    const g = this.residentPathLayer;
    if (!g) return;
    g.clear();
    const resident = this.traffic?.getResident(this.selectedResidentId);
    if (!resident?.isMoving || !resident.remainingCells.length) return;
    const points = [resident.position, ...resident.remainingCells.map(walkPoint)];
    g.lineStyle(2, 0x9aeed7, 0.54);
    for (let i = 1; i < points.length; i++) {
      g.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      g.fillStyle(0xc1f9eb, 0.72);
      g.fillCircle(points[i].x, points[i].y, 2.5);
    }
  }

  private beginResidentWalk(residentId: string, roomId: string, manual: boolean): boolean {
    if (this.session.survivors.assignment(residentId) || !this.traffic?.goToRoom(residentId, roomId)) return false;
    this.residentWaitMs.set(residentId, manual ? 9000 : 1800);
    this.syncResidents();
    this.paintResidentPath();
    return true;
  }

  private patrolResident(residentId: string): void {
    const resident = this.traffic?.getResident(residentId);
    if (!resident) return;
    const rooms = this.layout.rooms;
    const cursor = this.patrolCursors.get(residentId) ?? 0;
    for (let i = 0; i < rooms.length; i++) {
      const index = (cursor + i) % rooms.length;
      if (rooms[index].id === resident.destinationId) continue;
      if (this.beginResidentWalk(residentId, rooms[index].id, false)) {
        this.patrolCursors.set(residentId, (index + 1) % rooms.length);
        return;
      }
    }
    this.residentWaitMs.set(residentId, 4000);
  }

  private refreshResidentPath(): void {
    if (!this.traffic) return;
    this.session.survivors.setLayout(this.layout);
    const cancelled = this.traffic.refresh();
    for (const id of cancelled) this.residentWaitMs.set(id, 1600);
    this.syncResidents();
    this.paintResidentPath();
  }

  private paintPreview(): void {
    if (!this.preview) return;
    const g = this.preview;
    g.clear();
    this.previewReason?.setVisible(false);
    // Show eligible anchors even before a touch; preview works identically on mobile and web.
    if (this.mode === 'build' && this.session.canAfford(this.session.buildCost(this.selectedRoom))) {
      const definition = ROOM_DEFINITIONS[this.selectedRoom];
      for (let y = WORLD.minY; y < 0; y++) {
        for (let x = 0; x <= WORLD.cols - definition.width; x++) {
          if (!this.session.canBuild(this.selectedRoom, x, y).ok) continue;
          const { left, top } = toPixels(x, y);
          g.fillStyle(0x6acdad, 0.13);
          g.fillRect(left + 3, top + 3,
            definition.width * WORLD.cellSize - 6, definition.height * WORLD.cellSize - 6);
          g.lineStyle(1, 0x89e5bd, 0.55);
          g.strokeRect(left + 3, top + 3,
            definition.width * WORLD.cellSize - 6, definition.height * WORLD.cellSize - 6);
        }
      }
    }
    const selected = this.mode === 'upgrade'
      ? this.layout.rooms.find((room) => room.id === this.selectedUpgradeId)
      : undefined;
    if (selected) {
      const { left, top } = toPixels(selected.x, selected.y);
      g.lineStyle(3, 0xffd886, 1);
      g.strokeRect(left + 3, top + 3, selected.width * WORLD.cellSize - 6, selected.height * WORLD.cellSize - 6);
    }
    if (!this.hovered) return;
    const { x, y } = this.hovered;
    // Do not render build/dig/move ghosts over the non-buildable surface.
    if (y >= 0 && (this.mode === 'build' || this.mode === 'dig' || this.mode === 'move')) return;
    const room = this.layout.getRoomAt(x, y);
    let width = 1, height = 1, startX = x, startY = y, valid = false;
    let rejection: string | null = null;
    if (this.mode === 'elevator') {
      const result=this.layout.canBuildElevator(x,y);
      valid=result.ok && this.session.canAfford(ELEVATOR_DEFINITION.cost);
      if(!valid) {
        const point=toPixels(x,y);
        this.previewReason ??= this.add.text(0,0,'',{fontSize:'12px',color:'#ffffff',backgroundColor:'#641c30',wordWrap:{width:170},padding:{x:5,y:5}}).setDepth(7).setResolution(3);
        this.previewReason.setText(localizeGameMessage(result.ok ? 'سکهٔ کافی برای این عملیات ندارید.' : result.reason)).setPosition(point.left+54,point.top).setVisible(true);
      }
    } else if (this.mode === 'build') {
      const d = ROOM_DEFINITIONS[this.selectedRoom];
      width = d.width; height = d.height;
      const result = this.session.canBuild(this.selectedRoom, x, y);
      valid = result.ok && this.session.canAfford(this.session.buildCost(this.selectedRoom));
      if (!valid) rejection = result.ok ? 'سکهٔ کافی برای این عملیات ندارید.' : result.reason;
    } else if (this.mode === 'dig') {
      valid = this.layout.terrain.canDig(x, y).ok && this.session.canAfford(this.session.digCost());
    } else if (this.mode === 'move' && this.pendingMoveId) {
      const selected = this.layout.rooms.find((r) => r.id === this.pendingMoveId);
      if (!selected) return;
      width = selected.width; height = selected.height;
      const result = this.layout.canMove(selected.id, x, y);
      valid = result.ok;
      if (!result.ok) rejection = result.reason;
    } else if (room) {
      startX = room.x; startY = room.y;
      width = room.width; height = room.height;
      valid = this.mode === 'remove' ? this.layout.canRemove(room.id).ok :
        this.mode === 'upgrade' ?
        this.session.upgradeCostAt(x, y) !== null &&
        this.session.canAfford(this.session.upgradeCostAt(x, y)!) :
        this.mode === 'navigate' ?
          !!this.traffic?.getResident(this.selectedResidentId) &&
          findRoomPath(this.layout, this.traffic.getResident(this.selectedResidentId)!.cell, room.id) !== null :
          this.layout.canEditRoom(room);
      if (this.mode === 'remove' && !valid) {
        const result = this.layout.canRemove(room.id);
        if (!result.ok) rejection = result.reason;
      }
    } else return;
    if (rejection) {
      const point = toPixels(startX, startY);
      this.previewReason ??= this.add.text(0, 0, '', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#641c30',
        wordWrap: { width: 190 }, padding: { x: 5, y: 5 }
      }).setDepth(7).setResolution(3);
      this.previewReason.setText(localizeGameMessage(rejection))
        .setPosition(point.left + 10, point.top - 36).setVisible(true);
    }
    const { left, top } = toPixels(startX, startY);
    const w = width * WORLD.cellSize - 4, h = height * WORLD.cellSize - 4;
    g.fillStyle(valid ? 0x6acdad : 0xe48384, 0.25);
    g.fillRect(left + 2, top + 2, w, h);
    g.lineStyle(2, valid ? 0x89e5bd : 0xff9192);
    g.strokeRect(left + 2, top + 2, w, h);
  }
}

