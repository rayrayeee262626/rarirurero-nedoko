import {headerMarkup,footerMarkup} from './site-view.js';
document.querySelector('#site-header').innerHTML=headerMarkup(location.pathname);
document.querySelector('#site-footer').innerHTML=footerMarkup(new Date().getFullYear());
const menu=document.querySelector('.nav-toggle');menu.addEventListener('click',()=>{const opened=document.querySelector('.nav').classList.toggle('open');menu.setAttribute('aria-expanded',opened?'true':'false');menu.setAttribute('aria-label',opened?'メニューを閉じる':'メニューを開く')});
