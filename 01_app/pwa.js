if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register(new URL('../sw.js',document.currentScript.src),{scope:new URL('../',document.currentScript.src).pathname,updateViaCache:'none'}).then(registration=>registration.update()).catch(error=>{
  console.warn('Offline shell unavailable:',error.message);
 });
}
