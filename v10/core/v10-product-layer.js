(() => {
  "use strict";

  /*
   * Product-gap layer. It intentionally does not fake payment or LLM success.
   * It provides stable UI/state entry points while V10 Core/provider wiring
   * is integrated by the host application.
   */

  const PLAN_KEY = "garang_plan_v10";
  const LOCALE_KEY = "garang_locale_v10";

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]
  );

  const plan = () => localStorage.getItem(PLAN_KEY) === "PRO" ? "PRO" : "FREE";
  const locale = () => localStorage.getItem(LOCALE_KEY) || "ko";

  const close = () => document.querySelector("[data-g10-modal]")?.remove();

  function modal(title, html) {
    close();
    const el = document.createElement("div");
    el.dataset.g10Modal = "1";
    el.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:#000b;display:grid;place-items:center;padding:14px">
        <section style="width:min(760px,100%);max-height:90vh;overflow:auto;background:#111417;color:#fff;border:1px solid #30363b;border-radius:22px;padding:18px">
          <header style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <h2 style="margin:0">${esc(title)}</h2>
            <button data-g10-close style="padding:8px 12px;border-radius:10px">닫기</button>
          </header>
          <div style="margin-top:14px">${html}</div>
        </section>
      </div>`;
    el.addEventListener("click", e => {
      if (e.target === el.firstElementChild || e.target.closest("[data-g10-close]")) close();
    });
    document.body.appendChild(el);
    return el;
  }

  function openPlan() {
    const p = plan();
    const el = modal("GARANG FREE / PRO", `
      <p>현재 플랜: <b>${p}</b></p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <article style="padding:14px;border:1px solid #30363b;border-radius:14px">
          <h3>FREE</h3><p>기본 기록 및 기본 코칭</p>
        </article>
        <article style="padding:14px;border:1px solid #30363b;border-radius:14px">
          <h3>PRO</h3><p>고급 개인화 코칭과 확장 기능</p>
        </article>
      </div>
      <p style="opacity:.7;font-size:12px;margin-top:14px">
        실제 결제 승인 없이 PRO를 판매 완료로 처리하지 않습니다.
        결제 provider 연결 시 이 진입점을 실제 checkout으로 연결합니다.
      </p>
      <button data-g10-upgrade style="padding:11px 14px;border:0;border-radius:10px;font-weight:800">
        ${p === "PRO" ? "FREE로 전환" : "PRO 업그레이드"}
      </button>`);
    el.querySelector("[data-g10-upgrade]").onclick = () => {
      if (p === "PRO") {
        localStorage.setItem(PLAN_KEY, "FREE");
        close(); location.reload();
        return;
      }
      alert("결제 provider가 연결되지 않아 실제 결제는 아직 실행하지 않습니다.");
    };
  }

  function openBody() {
    modal("신체 데이터 / InBody", `
      <p style="opacity:.7">기존 데이터 모델을 침범하지 않는 별도 입력 진입점입니다.</p>
      <div style="display:grid;gap:9px">
        <input id="g10-w" type="number" step="0.1" placeholder="체중 kg">
        <input id="g10-f" type="number" step="0.1" placeholder="체지방률 %">
        <input id="g10-m" type="number" step="0.1" placeholder="골격근량 kg">
        <button id="g10-body-save" style="padding:11px;border:0;border-radius:10px;font-weight:800">저장</button>
      </div>`);
    document.getElementById("g10-body-save").onclick = () => {
      const row = { date:new Date().toISOString() };
      const map = [["g10-w","weight"],["g10-f","bodyFat"],["g10-m","skeletalMuscle"]];
      for (const [id,key] of map) {
        const v = document.getElementById(id).value;
        if (v !== "") row[key] = Number(v);
      }
      const key = "garang_body_v10";
      const old = JSON.parse(localStorage.getItem(key) || "[]");
      old.push(row);
      localStorage.setItem(key, JSON.stringify(old.slice(-200)));
      close();
      alert("신체 데이터가 저장되었습니다.");
    };
  }

  function openLocale() {
    const langs = [["ko","한국어"],["en","English"],["ja","日本語"],["zh","中文"]];
    const el = modal("언어", langs.map(([v,n]) =>
      `<button data-locale="${v}" style="margin:4px;padding:10px">${n}${locale()===v?" ✓":""}</button>`).join(""));
    el.querySelectorAll("[data-locale]").forEach(b => b.onclick = () => {
      localStorage.setItem(LOCALE_KEY, b.dataset.locale);
      close();
      document.dispatchEvent(new CustomEvent("garang:locale-change",{detail:{locale:b.dataset.locale}}));
      alert("언어 설정이 저장되었습니다.");
    });
  }

  function openChat() {
    const el = modal("GARANG AI", `
      <div style="min-height:45vh;max-height:60vh;overflow:auto;padding:4px">
        <p style="padding:12px;background:#1b2025;border-radius:12px">
          GARANG AI 대화 화면입니다. 실제 LLM 응답은 V10 AI Router와 provider가 연결되면 이 화면에 주입됩니다.
        </p>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <textarea id="g10-chat-input" style="flex:1;min-height:64px" placeholder="GARANG에게 메시지를 입력하세요"></textarea>
        <button id="g10-chat-send" style="padding:10px">전송</button>
      </div>`);
    el.querySelector("#g10-chat-send").onclick = () => {
      const v = el.querySelector("#g10-chat-input").value.trim();
      if (v) alert("메시지는 입력되었습니다. 실제 AI 응답은 provider 연결 후 활성화됩니다.");
    };
  }

  window.GARANG_V10 = Object.freeze({
    openPlan, openBody, openLocale, openChat,
    getPlan: plan, getLocale: locale
  });

  window.addEventListener("load", () => {
    document.getElementById("planBadge")?.addEventListener("click", openPlan);
    document.getElementById("profileBtn")?.addEventListener("click", openBody);
    document.getElementById("menuBtn")?.addEventListener("click", openLocale);
    document.querySelectorAll('[data-page="ai"]').forEach(b =>
      b.addEventListener("click", e => { e.preventDefault(); openChat(); }));
  });
})();
