import type { GameSnapshot } from '../../modules/economy/session';
import { getLocale } from '../../i18n';
import { ROOM_DEFINITIONS } from '../../modules/building/catalog';
export function mountSurvivorPanel(root:HTMLElement,assign:(id:string,roomId:string)=>void,release:(id:string)=>void) {
  return (s:GameSnapshot)=>{
    const en=getLocale()==='en',heading=document.createElement('h3');
    heading.textContent=en?'Survivors · guard posts':'بازماندگان · نگهبانی';root.replaceChildren(heading);
    const posts=s.base.rooms.filter(r=>r.type==='guardPost');
    for(const room of posts) {
      const a=s.survivors.assignments.filter(a=>a.roomId===room.id),p=document.createElement('p');
      const present=a.filter(a=>a.state==='active').length;
      const post=s.guardPosts.posts.find(p=>p.roomId===room.id)!;
      p.textContent=`${en?ROOM_DEFINITIONS[room.type].label:'نگهبانی'} · ${room.id} · LV ${room.level} · ${present}/${post.guardCapacity} · HP ${post.health}/${post.maxHealth} · ${Math.round(post.readiness*100)}% · ${post.status==='ready'?(en?'Ready for defense integration':'آماده برای اتصال به دفاع'):(en?post.status:post.status==='unpowered'?'بدون برق':post.status==='damaged'?'آسیب‌دیده':'بدون نیرو')} · ${post.equipment.length?post.equipment.join(', '):(en?'Equipment adapter pending':'اتصال تجهیزات در انتظار')}`;root.append(p);
    }
    for(const person of s.survivors.survivors) {
      const row=document.createElement('div'),label=document.createElement('p'),job=s.survivors.assignments.find(a=>a.survivorId===person.id);
      const states={enRoute:en?'En route':'در مسیر',active:en?'On duty':'در پست',suspended:en?'Suspended':'معلق'};
      label.textContent=`${person.name} · ${job?`${job.roomId} · ${states[job.state]}`:(en?'Available':'آزاد')}`;row.append(label);
      if(job){const b=document.createElement('button');b.type='button';b.dataset.release=person.id;b.textContent=en?'Release':'آزادسازی';b.onclick=()=>release(person.id);row.append(b);}
      else for(const room of posts){const b=document.createElement('button');b.type='button';b.dataset.assignRoom=room.id;b.textContent=`${en?'Assign':'تخصیص'} · ${room.id}`;b.onclick=()=>assign(person.id,room.id);row.append(b);}
      root.append(row);
    }
  };
}
