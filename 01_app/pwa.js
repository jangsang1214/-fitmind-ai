if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register(new URL('../sw.js',document.currentScript.src),{scope:new URL('../',document.currentScript.src).pathname}).catch(error=>{
  console.warn('Offline shell unavailable:',error.message);
 });
}
