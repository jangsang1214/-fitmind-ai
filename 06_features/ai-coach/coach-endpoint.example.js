// FitMind AI V6 backend contract (Node/Express-style pseudocode).
// IMPORTANT: keep provider API keys in server environment variables, never in the app.
// Add authentication, rate limiting, logging minimization, and subscription verification
// before production deployment.

export async function coach(req,res){
  const user=await authenticate(req);
  if(!user) return res.status(401).json({error:"unauthorized"});
  if(!["pro","pro_plus"].includes(user.plan))
    return res.status(402).json({error:"pro_required"});

  const quota=await quotaService.reserve(user.id, req.body.mode === "cloud" ? 5 : 3);
  if(!quota.ok) return res.status(429).json({error:"quota_exceeded"});

  const memory=await memoryStore.searchRelevant(user.id, req.body.query, {limit:8});
  const prompt=buildCoachPrompt({
    query:req.body.query,
    compactContext:req.body.context,
    relevantMemory:memory
  });

  // Provider call goes here using process.env.AI_PROVIDER_KEY.
  // Do not store raw conversations unless the user has explicitly opted in.
  const answer=await aiProvider.generate({
    prompt,
    maxOutputTokens:req.body.mode==="cloud"?500:350
  });

  await quotaService.commit(quota.id);
  return res.json({
    text:answer.text,
    memoryCandidates:extractMemoryCandidates(answer),
    usage:{credits:quota.cost}
  });
}


/* GARANG v8.5.1 — Modern Workout Certification */
window.GARANGWorkoutCert = {
  render: function(target, data) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const sets = (data.sets || []).map(s => `${s.weight ?? '-'}kg × ${s.reps ?? '-'}${s.rpe ? ` · RPE ${s.rpe}` : ''}`).join('  •  ');
    el.classList.add('garang-cert-modern');
    el.innerHTML = `
      ${data.photo ? `<img class="cert-photo" src="${data.photo}" alt="Workout">` : ''}
      <div class="cert-top">
        <div class="cert-brand"><span class="cert-mark">G</span><span>GARANG</span></div>
        <div class="cert-date">${data.date || ''}</div>
      </div>
      <div class="cert-bottom">
        <div class="cert-kicker">WORKOUT VERIFIED</div>
        <h2 class="cert-title">${data.exercise || 'Workout'}</h2>
        <div class="cert-stats">
          <div class="cert-stat"><span class="cert-label">Sets</span><span class="cert-value">${data.setCount ?? (data.sets||[]).length}</span></div>
          <div class="cert-stat"><span class="cert-label">Volume</span><span class="cert-value">${data.volume != null ? data.volume.toLocaleString() + ' kg' : '-'}</span></div>
          <div class="cert-stat"><span class="cert-label">PR</span><span class="cert-value">${data.pr ? 'NEW PR' : '—'}</span></div>
        </div>
        <div class="cert-sets">${sets}</div>
      </div>`;
    if (data.monochrome) el.classList.add('is-monochrome');
    return el;
  }
};

