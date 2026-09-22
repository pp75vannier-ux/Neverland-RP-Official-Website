const menu=document.querySelector('.menu'),links=document.querySelector('.links');
menu.addEventListener('click',()=>links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
const obs=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('show')),{threshold:.12});
document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));
const sections=[...document.querySelectorAll('section[id]')], navs=[...document.querySelectorAll('.links a')];
window.addEventListener('scroll',()=>{let cur='accueil';sections.forEach(s=>{if(scrollY>=s.offsetTop-130)cur=s.id});navs.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur))});



