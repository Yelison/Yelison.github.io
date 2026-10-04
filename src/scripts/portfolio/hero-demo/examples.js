/**
 * The three snippets typed in the hero editor. They are real, working code: the
 * preview next to the editor renders whatever part of them has been typed so far.
 */
export const examples = [
  {
    languageKey: 'codeLanguageHtml',
    code: `<article class="live-card">
  <div class="css-art" style="position:relative;height:225px;transition:transform .35s ease-out">
    <div class="art-orbit" style="position:absolute;top:50%;left:50%;translate:-50% -50%;transition:all .6s;width:40px;height:40px;border:1px solid #6a7078;z-index:3">
      <span class="art-dot" style="position:absolute;top:50%;left:50%;translate:-50% -50%;transition:all .6s;width:6px;height:6px;border-radius:0;background:#85858c;z-index:3"></span>
    </div>
    <div class="art-frame" style="position:absolute;top:50%;left:50%;translate:-50% -50%;transition:all .6s;width:30px;height:30px;border:1px solid #6a7078"></div>
    <div class="art-core" style="position:absolute;top:50%;left:50%;translate:-50% -50%;transition:all .6s;width:12px;height:12px;background:#85858c"></div>
  </div>
</article>`,
  },
  {
    languageKey: 'codeLanguageCss',
    code: `.css-art {
  position: relative !important;
  width: 100% !important;
  height: 225px !important;
  perspective: 700px !important;
  transform-style: preserve-3d !important;
  transition: transform .35s ease-out !important;
}
.css-art > * {
  position: absolute !important;
  top: 50% !important; left: 50% !important;
  translate: -50% -50% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  transition: width .6s, height .6s,
    transform .6s, border-radius .6s,
    background .6s, box-shadow .6s !important;
}
@property --orbit-tilt {
  syntax: "<angle>";
  inherits: true;
  initial-value: 0deg;
}
@property --orbit-turn {
  syntax: "<angle>";
  inherits: true;
  initial-value: 0deg;
}
.art-dot {
  position: absolute;
  z-index: 3;
  border-radius: 0;
  transform: rotateX(calc(-1 * var(--orbit-tilt, 0deg)))
    rotate(calc(-1 * var(--orbit-turn, 0deg)));
  top: 50%; left: 50%;
  translate: -50% -50%;
  transition: none !important;
}
.art-orbit {
  transition: width .6s ease, height .6s ease,
    border-radius .6s ease, border-color .6s ease,
    --orbit-tilt .6s, --orbit-turn .6s !important;
  z-index: 3;
  width: 180px !important; height: 180px !important;
  border: 1px solid #08e8de55 !important;
  border-radius: 50% !important;
  --orbit-tilt: 55deg;
  --orbit-turn: -25deg;
  transform-style: preserve-3d;
  transform: rotate(var(--orbit-turn)) rotateX(var(--orbit-tilt));
}
.css-art:not(.is-styled) .art-dot {
  border-radius: 0 !important;
}
.is-positioned .art-dot {
  transition: transform .7s ease !important;
  transform: translateX(90px)
    rotateX(calc(-1 * var(--orbit-tilt, 0deg)))
    rotate(calc(-1 * var(--orbit-turn, 0deg)));
}
.is-styled .art-dot {
  width: 8px !important; height: 8px !important;
  border-radius: 50% !important;
  background: #08E8DE !important;
  box-shadow: 0 0 14px #08e8de80;
  transition: width .6s, height .6s,
    background .6s, border-radius .6s,
    box-shadow .6s, transform .7s ease !important;
}
.is-ready .art-orbit {
  animation: orbit-travel 8s linear 1 forwards;
}
.is-ready .art-dot {
  animation: dot-facing 8s linear 1 forwards;
}
.is-ready .art-core {
  animation: center-float 4s ease-in-out infinite;
}
@keyframes orbit-travel {
  from { transform: rotate(-25deg) rotateX(55deg) rotateZ(0deg); }
  to { transform: rotate(-25deg) rotateX(55deg) rotateZ(360deg); }
}
@keyframes dot-facing {
  from { transform: translateX(90px) rotateZ(0deg) rotateX(-55deg) rotate(25deg); }
  to { transform: translateX(90px) rotateZ(-360deg) rotateX(-55deg) rotate(25deg); }
}
@keyframes center-float {
  0%, 100% { transform: rotate(-15deg) translateY(0); }
  50% { transform: rotate(-15deg) translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .is-ready .art-orbit, .is-ready .art-dot, .is-ready .art-core { animation: none; }
}
.art-frame {
  width: 112px !important; height: 112px !important;
  border: 1px solid #08E8DE !important;
  border-radius: 24px !important;
  transform: rotate(45deg) !important;
}
.art-core {
  width: 62px !important; height: 62px !important;
  border-radius: 18px !important;
  background: linear-gradient(135deg,
    #08E8DE, #087f9b) !important;
  box-shadow: 0 0 45px #08e8de35 !important;
  transform: rotate(-15deg);
}
}`,
  },
  {
    languageKey: 'codeLanguageJs',
    code: `const card = document.querySelector(".live-card");
const art = card.querySelector(".css-art");
art.onpointermove = (event) => {
  const box = art.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  art.style.transform =
    "rotateX(" + (0.5 - y) * 18 + "deg) " +
    "rotateY(" + (x - 0.5) * 18 + "deg)";
};
art.onpointerleave = () => {
  art.style.transform = "rotateX(0) rotateY(0)";
};
art.addEventListener("transitionend", (event) => {
  if (!event.target.matches(".art-dot") ||
      event.propertyName !== "transform") return;
  if (!art.classList.contains("is-positioned") ||
      art.classList.contains("is-styled")) return;
  art.classList.add("is-styled");
  setTimeout(() => {
    art.classList.add("is-ready");
    setTimeout(() => {
      art.classList.remove("is-ready");
      setTimeout(() => {
        art.classList.remove("is-positioned");
        setTimeout(() => art.classList.remove("is-styled"), 700);
      }, 42);
    }, 8000);
  }, 600);
});
art.classList.add("is-positioned");`,
  },
];

/** Typing order: HTML → CSS → JS, then erase back JS → CSS → HTML. */
export const cycle = [0, 1, 2, 2, 1, 0];

/** Node.js endpoint typed in "Backend" mode; the response panel shows what it returns. */
export const apiSource = `app.get("/api/projects", (req, res) => {
  res.json({
    developer: "Yelisson Ortiz",
    role: "Full-Stack Developer",
    projects: [
      { name: "Silabín", stack: "Next.js" }
    ]
  });
});`;

/** Extracts the object passed to `res.json(...)` and pretty-prints it as JSON. */
export function responseBody(source = apiSource) {
  let body = source.slice(source.indexOf('res.json(') + 9);
  body = body
    .slice(0, body.indexOf('\n  });') + 4)
    .replace(/\b(developer|role|projects|name|access|stack):/g, '"$1":');
  return JSON.stringify(JSON.parse(body), null, 2);
}
