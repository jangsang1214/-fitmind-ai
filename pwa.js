if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(error => console.warn('Offline shell unavailable:', error.message));
  });
}
