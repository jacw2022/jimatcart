import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Plan = "one" | "split";

export function InteractiveBasket() {
  const [plan, setPlan] = useState<Plan>("split");
  const [engaged, setEngaged] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const basketGreen = `${uid}-basketGreen`;
  // Fixed id — referenced from CSS `.route-split { stroke: url(#…) }`
  const limeRoute = "jc-welcome-limeRoute";
  const mintFace = `${uid}-mintFace`;
  const softShadow = `${uid}-softShadow`;
  const smallShadow = `${uid}-smallShadow`;
  const descId = `${uid}-optimizer-description`;

  useEffect(() => {
    const timer = window.setTimeout(() => setEngaged(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  function moveScene(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width - 0.5) * 2;
    const y = ((event.clientY - box.top) / box.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--mx", x.toFixed(3));
    event.currentTarget.style.setProperty("--my", y.toFixed(3));
  }

  function resetScene(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--mx", "0");
    event.currentTarget.style.setProperty("--my", "0");
  }

  function selectWithKeyboard(event: KeyboardEvent<SVGGElement>, next: Plan) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPlan(next);
      setEngaged(true);
    }
  }

  const sceneStyle = { "--mx": 0, "--my": 0 } as CSSProperties;

  return (
    <div
      ref={sceneRef}
      className={`optimizer-scene plan-${plan} ${engaged ? "is-engaged" : ""}`}
      style={sceneStyle}
      onPointerMove={moveScene}
      onPointerLeave={resetScene}
    >
      <div className="scene-glow" />
      <svg
        className="optimizer-art"
        viewBox="0 0 620 620"
        role="img"
        aria-label="Interactive grocery route comparison"
        aria-describedby={descId}
      >
        <desc id={descId}>
          Choose between one shop and a two-shop split. The routes animate and
          the basket shows the selected savings plan.
        </desc>

        <defs>
          <linearGradient id={basketGreen} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#078b57" />
            <stop offset="1" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id={limeRoute} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#72d93c" />
            <stop offset="1" stopColor="#b6f36a" />
          </linearGradient>
          <linearGradient id={mintFace} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4fff1" />
            <stop offset="1" stopColor="#dff7db" />
          </linearGradient>
          <filter id={softShadow} x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow
              dx="0"
              dy="16"
              stdDeviation="16"
              floodColor="#064e3b"
              floodOpacity=".16"
            />
          </filter>
          <filter id={smallShadow} x="-40%" y="-40%" width="180%" height="200%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="8"
              floodColor="#064e3b"
              floodOpacity=".15"
            />
          </filter>
        </defs>

        <g className="ambient-layer" aria-hidden="true">
          <circle cx="316" cy="309" r="235" fill="#e9fadd" opacity=".42" />
          <circle
            className="orbit orbit-one"
            cx="91"
            cy="319"
            r="7"
            fill="#a8ef57"
          />
          <circle
            className="orbit orbit-two"
            cx="526"
            cy="339"
            r="5"
            fill="#078b57"
            opacity=".5"
          />
          <path
            className="leaf leaf-one"
            d="M95 455c43-6 70 16 72 54-39 6-67-12-72-54Z"
            fill="#bcefab"
          />
          <path
            className="leaf leaf-two"
            d="M525 427c-35 2-54 22-51 54 33-2 53-19 51-54Z"
            fill="#8eea64"
          />
          <path
            d="M115 472c18 8 31 19 43 33M511 443c-15 10-24 21-31 32"
            fill="none"
            stroke="#65cf86"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            className="spark spark-one"
            d="m101 374 7 14 14 7-14 7-7 14-7-14-14-7 14-7Z"
            fill="#a8ef57"
          />
          <path
            className="spark spark-two"
            d="m533 238 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z"
            fill="#69d891"
          />
        </g>

        <g className="route-layer" fill="none" strokeLinecap="round">
          <path
            className="route-base"
            d="M310 334V294C310 235 270 205 222 205H160"
          />
          <path
            className="route-base"
            d="M310 334V294C310 235 350 205 398 205H460"
          />
          <path
            className="route route-one"
            d="M310 334V294C310 235 270 205 222 205H160"
          />
          <path
            className="route route-split"
            d="M310 334V294C310 235 350 205 398 205H460"
          />
          <circle className="route-dot dot-one" cx="197" cy="205" r="7" />
          <circle className="route-dot dot-two" cx="423" cy="205" r="7" />
        </g>

        <g
          className="shop-choice shop-one"
          role="button"
          aria-label="Preview the one-shop plan"
          tabIndex={0}
          onPointerEnter={() => {
            setPlan("one");
            setEngaged(true);
          }}
          onClick={() => {
            setPlan("one");
            setEngaged(true);
          }}
          onKeyDown={(event) => selectWithKeyboard(event, "one")}
        >
          <g filter={`url(#${smallShadow})`}>
            <rect x="63" y="105" width="132" height="110" rx="25" fill="#fff" />
            <path d="M75 119h108l10 37H65Z" fill="#e4f8df" />
            <path
              d="M65 149h128v13c0 13-17 19-27 7-8 12-25 12-33 0-8 12-25 12-33 0-10 12-35 6-35-7Z"
              fill="#078b57"
            />
            <path d="M100 215v-36h55v36" fill="#dff7db" />
            <path d="M122 179h33v36h-33Z" fill="#9bea55" />
          </g>
          <g className="pin pin-one">
            <path
              d="M129 72c-22 0-39 17-39 38 0 28 39 62 39 62s39-34 39-62c0-21-17-38-39-38Z"
              fill="#078b57"
            />
            <circle cx="129" cy="109" r="15" fill="#efffe9" />
          </g>
          <g className="choice-pill" transform="translate(85 226)">
            <rect width="89" height="30" rx="15" />
            <text x="44.5" y="20" textAnchor="middle">
              1 shop
            </text>
          </g>
        </g>

        <g
          className="shop-choice shop-split"
          role="button"
          aria-label="Preview the two-shop split plan"
          tabIndex={0}
          onPointerEnter={() => {
            setPlan("split");
            setEngaged(true);
          }}
          onClick={() => {
            setPlan("split");
            setEngaged(true);
          }}
          onKeyDown={(event) => selectWithKeyboard(event, "split")}
        >
          <g filter={`url(#${smallShadow})`}>
            <rect
              x="425"
              y="105"
              width="132"
              height="110"
              rx="25"
              fill="#fff"
            />
            <path d="M437 119h108l10 37H427Z" fill="#efffdc" />
            <path
              d="M427 149h128v13c0 13-17 19-27 7-8 12-25 12-33 0-8 12-25 12-33 0-10 12-35 6-35-7Z"
              fill="#9bea55"
            />
            <path d="M462 215v-36h55v36" fill="#dff7db" />
            <path d="M484 179h33v36h-33Z" fill="#078b57" />
          </g>
          <g className="pin pin-split">
            <path
              d="M491 72c-22 0-39 17-39 38 0 28 39 62 39 62s39-34 39-62c0-21-17-38-39-38Z"
              fill="#9bea55"
            />
            <circle cx="491" cy="109" r="15" fill="#efffe9" />
          </g>
          <g className="choice-pill" transform="translate(443 226)">
            <rect width="97" height="30" rx="15" />
            <text x="48.5" y="20" textAnchor="middle">
              2 shops
            </text>
          </g>
        </g>

        <g className="basket-group" filter={`url(#${softShadow})`}>
          <path
            className="basket-handle"
            d="M213 393v-28c0-26 20-46 46-46h102c26 0 46 20 46 46v28"
            fill="none"
            stroke={`url(#${basketGreen})`}
            strokeWidth="22"
            strokeLinecap="round"
          />
          <path
            d="M180 380h260l-27 151c-4 23-24 40-48 40H255c-24 0-44-17-48-40Z"
            fill={`url(#${basketGreen})`}
          />
          <path
            d="M211 414h198l-20 104c-3 13-14 22-27 22H258c-13 0-24-9-27-22Z"
            fill={`url(#${mintFace})`}
          />
          <g className="basket-slats" fill="#078b57">
            <rect x="252" y="468" width="18" height="65" rx="9" />
            <rect x="281" y="468" width="18" height="65" rx="9" />
            <rect x="321" y="468" width="18" height="65" rx="9" />
            <rect x="350" y="468" width="18" height="65" rx="9" />
          </g>
          <g className="basket-face" fill="#064e3b">
            <ellipse className="eye eye-left" cx="273" cy="449" rx="9" ry="10" />
            <ellipse
              className="eye eye-right"
              cx="347"
              cy="449"
              rx="9"
              ry="10"
            />
            <path
              className="smile"
              d="M294 450c9 17 23 17 32 0"
              fill="none"
              stroke="#064e3b"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        </g>

        <g className="decision-badge" filter={`url(#${smallShadow})`}>
          <circle cx="310" cy="333" r="48" fill={`url(#${basketGreen})`} />
          <path
            className="check"
            d="m286 333 16 17 33-37"
            fill="none"
            stroke="#fff"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g
          className="coin-stack"
          filter={`url(#${smallShadow})`}
          aria-hidden="true"
        >
          <g className="coin coin-three">
            <ellipse cx="451" cy="497" rx="42" ry="13" fill="#78cf31" />
            <path
              d="M409 478v19c0 8 19 14 42 14s42-6 42-14v-19Z"
              fill="#82db37"
            />
            <ellipse cx="451" cy="478" rx="42" ry="14" fill="#a8ef57" />
          </g>
          <g className="coin coin-two">
            <ellipse cx="451" cy="472" rx="42" ry="13" fill="#e9b90f" />
            <path
              d="M409 453v19c0 8 19 14 42 14s42-6 42-14v-19Z"
              fill="#f4c414"
            />
            <ellipse cx="451" cy="453" rx="42" ry="14" fill="#ffd841" />
          </g>
          <g className="coin coin-one">
            <ellipse cx="451" cy="447" rx="42" ry="13" fill="#78cf31" />
            <path
              d="M409 428v19c0 8 19 14 42 14s42-6 42-14v-19Z"
              fill="#82db37"
            />
            <ellipse cx="451" cy="428" rx="42" ry="14" fill="#a8ef57" />
            <path
              d="m451 419 4 7 8 2-8 4-4 7-4-7-8-4 8-2Z"
              fill="#fff"
            />
          </g>
        </g>
      </svg>

      <div className="interaction-hint" aria-hidden="true">
        <span className="hint-dot" />
        Hover or tap a shop
      </div>
    </div>
  );
}
