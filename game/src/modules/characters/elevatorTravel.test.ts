import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import { canWalkBetween, findRoomPath, walkPoint } from './pathfinding';
import { ResidentTraffic, type ElevatorPhase } from './traffic';

const SHAFT_X = 0;
const edge = [{x:0,y:-1},{x:0,y:-2}];

describe('physical elevator boarding and vertical travel', () => {
  it('allows vertical crossings only on a continuous elevator shaft', () => {
    const layout = new BuildingLayout();
    expect(canWalkBetween(layout, edge[0], edge[1])).toBe(true);
    expect(canWalkBetween(layout, {x:1,y:-1}, {x:1,y:-2})).toBe(false);
    expect(canWalkBetween(layout, {x:5,y:-1}, {x:5,y:-2})).toBe(false);
    const route = findRoomPath(layout, {x:6,y:-1}, 'initial-power')!;
    expect(route).not.toBeNull();
    for(let i=1;i<route.length;i++){
      if(route[i-1].y !== route[i].y)
        expect(route[i-1].x).toBe(SHAFT_X);
    }
  });

  it('opens doors, boards, closes, travels and exits before arrival', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout,[{id:'a',cell:{x:0,y:-1}}]);
    expect(traffic.goToRoom('a','initial-power')).toBe(true);
    const seen = new Set<ElevatorPhase>();
    let arrivalCount = 0;
    let inTransit = false;
    for(let i=0;i<160;i++){
      arrivalCount += traffic.advance(50).length;
      const a = traffic.getResident('a')!;
      if(a.elevator) {
        seen.add(a.elevator);
        inTransit = true;
        if(a.elevator==='travel'){
          expect(a.isMoving).toBe(true);
          expect(a.cell).toEqual({x:0,y:-1});
        }
      }
      if(arrivalCount)break;
    }
    expect(inTransit).toBe(true);
    expect([...seen]).toEqual(expect.arrayContaining([
      'opening','boarding','closing','travel','arrival-opening','exiting'
    ]));
    expect(arrivalCount).toBe(1);
    expect(traffic.getResident('a')!.elevator).toBeNull();
    expect(traffic.getResident('a')!.cell.y).toBe(-2);
    expect(traffic.elevatorCars[0].y).toBe(-2);
    expect(traffic.elevatorCars[0].phase).toBe('idle');
  });

  it('animates the landing doors and a fractional cabin position in transit', () => {
    const t = new ResidentTraffic(new BuildingLayout(),[{id:'a',cell:{x:0,y:-1}}]);
    expect(t.goToRoom('a','initial-power')).toBe(true);
    let sawOpenDoor=false, sawMovingCabin=false, sawClosedTravel=false;
    for(let i=0;i<100;i++) {
      t.advance(50);
      const cabin=t.elevatorCars[0];
      if(cabin.phase==='opening' && cabin.doorOpen>0 && cabin.doorOpen<=1) sawOpenDoor=true;
      if(cabin.phase==='travel'){
        sawClosedTravel ||= cabin.doorOpen===0;
        sawMovingCabin ||= cabin.y < -1 && cabin.y > -2;
      }
    }
    expect(sawOpenDoor).toBe(true);
    expect(sawMovingCabin).toBe(true);
    expect(sawClosedTravel).toBe(true);
  });

  it('summons a parked cabin to a different floor before opening the door', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout,[{id:'a',cell:{x:0,y:-2}}]);
    expect(traffic.goToRoom('a','initial-garden')).toBe(true);
    traffic.advance(50);
    expect(traffic.getResident('a')!.elevator).toBe('calling');
    const car = traffic.elevatorCars[0];
    expect(car.phase).toBe('calling');
    expect(car.y).toBeGreaterThan(-2);
    expect(car.y).toBeLessThanOrEqual(-1);
    for(let i=0;i<130;i++)traffic.advance(50);
    expect(layout.getRoomAt(traffic.getResident('a')!.cell.x,
      traffic.getResident('a')!.cell.y)?.id).toBe('initial-garden');
  });

  it('queues simultaneous passengers on a shaft without overlapping reservations', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout,[
      {id:'a',cell:{x:0,y:-1}}, {id:'b',cell:{x:0,y:-2}}
    ]);
    expect(traffic.goToRoom('a','initial-power')).toBe(true);
    expect(traffic.goToRoom('b','initial-garden')).toBe(true);
    let simultaneous = false;
    for(let i=0;i<200;i++){
      traffic.advance(50);
      const riding = traffic.residents.filter(r=>r.elevator!==null);
      simultaneous ||= riding.length>1;
      const occupied = traffic.residents.flatMap(r=>[
        r.cell.x+':'+r.cell.y,
        ...(r.isWalking?r.remainingCells.slice(0,1).map(c=>c.x+':'+c.y):[])
      ]);
      expect(new Set(occupied).size).toBe(occupied.length);
    }
    expect(simultaneous).toBe(false);
  });

  it('round-trips the lift phase through existing survivor save schema', () => {
    const layout = new BuildingLayout();
    const traffic = new ResidentTraffic(layout,[{id:'a',cell:{x:0,y:-1}}]);
    expect(traffic.goToRoom('a','initial-power')).toBe(true);
    for(let i=0;i<17;i++) traffic.advance(50);
    expect(traffic.getResident('a')!.elevator).not.toBeNull();
    const save = traffic.snapshot();
    const restored = ResidentTraffic.restore(layout,save);
    expect(restored).not.toBeNull();
    expect(restored!.getResident('a')!.elevator).toBe(traffic.getResident('a')!.elevator);
    for(let i=0;i<140;i++) restored!.advance(50);
    expect(restored!.getResident('a')!.isMoving).toBe(false);
    expect(restored!.getResident('a')!.position).toEqual(walkPoint(restored!.getResident('a')!.cell));
    expect(layout.getRoomAt(restored!.getResident('a')!.cell.x,restored!.getResident('a')!.cell.y)?.id)
      .toBe('initial-power');
    expect(ResidentTraffic.restore(layout,{...save,agents:[{
      ...save.agents[0],elevator:{...save.agents[0].elevator,phase:'teleport'}
    }]})).toBeNull();
  });

  it('migrates a previous-version room-to-room vertical step without losing the resident', () => {
    const layout = new BuildingLayout();
    expect(layout.dig(5,-2).ok).toBe(true);
    const traffic = new ResidentTraffic(layout,[{id:'a',cell:{x:5,y:-1}}]);
    expect(traffic.goToRoom('a','initial-power')).toBe(true);
    const before=traffic.snapshot();
    // Previous builds permitted leaving the command center straight down.
    before.agents[0].next={x:5,y:-2};
    before.agents[0].position=walkPoint({x:5,y:-1});
    before.agents[0].route=[];
    const restored=ResidentTraffic.restore(layout,before);
    expect(restored).not.toBeNull();
    const survivor=restored!.getResident('a')!;
    expect(survivor.cell).toEqual({x:5,y:-1});
    expect(survivor.remainingCells.at(0)).not.toEqual({x:5,y:-2});
    for(let i=0;i<250;i++) restored!.advance(50);
    expect(layout.getRoomAt(restored!.getResident('a')!.cell.x,
      restored!.getResident('a')!.cell.y)?.id).toBe('initial-power');
  });

  it('keeps the elevator sequence short under reduced-motion preferences', () => {
    const traffic=new ResidentTraffic(new BuildingLayout(),[{id:'a',cell:{x:0,y:-1}}]);
    expect(traffic.goToRoom('a','initial-power')).toBe(true);
    let arrived=false;
    for(let i=0;i<20;i++) arrived = traffic.advance(50,true).includes('a') || arrived;
    expect(arrived).toBe(true);
    const arrivedCell = traffic.getResident('a')!.cell;
    expect(new BuildingLayout().getRoomAt(arrivedCell.x, arrivedCell.y)?.id).toBe('initial-power');
  });
});
