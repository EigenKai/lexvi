"use client";

import { motion } from "motion/react";
import { type CSSProperties, useId } from "react";
import { ease } from "@/lib/motion";

/**
 * Mr. Minh's café — the same flat illustration as the demo film (film/lexvi-film/build.mjs, cafe()).
 * Drawn in a 1920×1080 viewBox; the wall and floor run far past it (overflow visible) so the scene
 * can sit in any frame. Poses and moods crossfade; nothing here loops.
 */
export type Pose = "rest" | "up" | "ear" | "joy";

/** The phone screen while he holds it up, in viewBox units (the camera zooms into this). */
export const PHONE_SCREEN = { x: 858, y: 452, w: 62, h: 88 } as const;

const SKIN = "#E2B48A";
const SKIN_D = "#D29F74";
const SHIRT = "#3E5C8A";
const fade = { duration: 0.25, ease: ease.smooth };

export function CafeScene({
  pose,
  happy = false,
  bright = false,
  open = false,
  className,
  style,
}: {
  pose: Pose;
  happy?: boolean;
  bright?: boolean;
  open?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const wall = bright ? ["#FBF6EC", "#F0E3CB"] : ["#F4EADA", "#E6D3B5"];
  const sky = bright ? ["#D5EBF5", "#F8EBCF"] : ["#F6D29E", "#EFAE84"];
  const sunY = bright ? 210 : 440;
  const handUp = pose === "up" || pose === "joy";
  return (
    <svg
      viewBox="0 0 1920 1080"
      overflow="visible"
      aria-hidden="true"
      className={className}
      style={style}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient
          id={`${id}w`}
          x1="0"
          y1="-1400"
          x2="0"
          y2="860"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={wall[0]} />
          <stop offset="1" stopColor={wall[1]} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect x="-4000" y="-1400" width="9920" height="2260" fill={`url(#${id}w)`} />
      {/* window */}
      <rect x="150" y="110" width="560" height="400" rx="10" fill="#8A6A48" />
      <rect x="168" y="128" width="524" height="364" fill={`url(#${id}s)`} />
      <circle cx="300" cy={sunY} r="64" fill="#FFF3D6" opacity="0.9" />
      <rect x="424" y="128" width="12" height="364" fill="#8A6A48" />
      <rect x="168" y="304" width="524" height="12" fill="#8A6A48" />
      <rect x="140" y="506" width="580" height="18" rx="4" fill="#A9845A" />
      {/* shelf */}
      <rect x="1330" y="430" width="440" height="16" rx="3" fill="#8A6A48" />
      <rect x="1362" y="364" width="58" height="66" rx="10" fill="#C9A57A" />
      <rect x="1446" y="344" width="42" height="86" rx="8" fill="#5A3A22" />
      <rect x="1514" y="384" width="74" height="46" rx="12" fill="#FAF8F3" />
      <rect x="1612" y="372" width="56" height="58" rx="8" fill="#B9876A" />
      <path
        d="M1640 372 Q1610 320 1626 300 M1640 372 Q1650 316 1676 304 M1640 372 Q1636 330 1650 290"
        stroke="#4E7A58"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      {/* shop sign */}
      <line x1="1470" y1="-60" x2="1486" y2="134" stroke="#5A3A22" strokeWidth="4" />
      <line x1="1710" y1="-60" x2="1694" y2="134" stroke="#5A3A22" strokeWidth="4" />
      <motion.g
        initial={false}
        animate={{ scaleY: open ? 0 : 1 }}
        transition={{ duration: 0.25, ease: ease.exit }}
        style={{ originX: 0.5, originY: 0 }}
      >
        <rect x="1380" y="130" width="420" height="104" rx="16" fill="#B42335" />
        <text
          x="1590"
          y="194"
          textAnchor="middle"
          fontFamily="var(--font-display), sans-serif"
          fontWeight="800"
          fontSize="32"
          fill="#FFFFFF"
        >
          CLOSED · ĐÓNG CỬA
        </text>
      </motion.g>
      <motion.g
        initial={false}
        animate={{ scaleY: open ? 1 : 0 }}
        transition={
          open ? { delay: 0.25, type: "spring", stiffness: 260, damping: 14 } : { duration: 0.1 }
        }
        style={{ originX: 0.5, originY: 0 }}
      >
        <rect x="1380" y="130" width="420" height="104" rx="16" fill="#0F7A55" />
        <text
          x="1590"
          y="194"
          textAnchor="middle"
          fontFamily="var(--font-display), sans-serif"
          fontWeight="800"
          fontSize="36"
          fill="#FFFFFF"
        >
          OPEN · MỞ CỬA
        </text>
      </motion.g>
      {/* floor */}
      <rect x="-4000" y="852" width="9920" height="10" fill="#A9845A" />
      <rect x="-4000" y="860" width="9920" height="1400" fill="#C9A57A" />
      {/* chair */}
      <rect x="566" y="470" width="16" height="390" rx="6" fill="#3B4558" />
      <rect x="566" y="648" width="220" height="18" rx="8" fill="#3B4558" />
      <rect x="760" y="660" width="14" height="200" rx="6" fill="#3B4558" />
      {/* far arm, raised in joy */}
      <motion.g
        initial={false}
        animate={{ opacity: pose === "joy" ? 1 : 0, rotate: pose === "joy" ? 0 : 70 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        style={{ originX: 0.76, originY: 0.92 }}
      >
        <path
          d="M646 470 L598 372 L614 272"
          stroke="#34507A"
          strokeWidth="38"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="614" cy="262" r="22" fill={SKIN} />
      </motion.g>
      {/* legs, body, head */}
      <path d="M640 640 L872 646 Q898 672 872 702 L640 700 Z" fill="#2B3242" />
      <path d="M842 690 L894 690 L888 842 L848 842 Z" fill="#2B3242" />
      <ellipse cx="884" cy="850" rx="42" ry="14" fill="#1F232B" />
      <path d="M628 452 Q700 432 772 452 L786 664 L616 664 Z" fill={SHIRT} />
      <path d="M684 446 L700 472 L716 446 Z" fill="#FAF8F3" />
      <path d="M652 520 L748 520 L760 704 L640 704 Z" fill="#8A5A36" />
      <path d="M656 522 L688 452 M744 522 L712 452" stroke="#8A5A36" strokeWidth="8" />
      <rect x="684" y="410" width="32" height="42" fill={SKIN_D} />
      <circle cx="636" cy="368" r="14" fill={SKIN_D} />
      <circle cx="700" cy="360" r="64" fill={SKIN} />
      <path
        d="M636 356 Q632 290 700 288 Q768 290 764 356 Q756 320 700 316 Q646 320 636 356 Z"
        fill="#CFCAC2"
      />
      <path d="M637 352 Q628 380 642 398 L648 360 Z" fill="#CFCAC2" />
      <circle
        cx="683"
        cy="362"
        r="16"
        fill="#FFFFFF"
        fillOpacity="0.18"
        stroke="#2A2F3A"
        strokeWidth="3.5"
      />
      <circle
        cx="719"
        cy="362"
        r="16"
        fill="#FFFFFF"
        fillOpacity="0.18"
        stroke="#2A2F3A"
        strokeWidth="3.5"
      />
      <path
        d="M699 362 L703 362 M667 360 L642 356"
        stroke="#2A2F3A"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="683" cy="363" r="4.5" fill="#2A2F3A" />
      <circle cx="719" cy="363" r="4.5" fill="#2A2F3A" />
      <path
        d="M701 370 L697 386 L705 388"
        stroke={SKIN_D}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M680 400 Q700 388 720 400 Q712 410 700 404 Q688 410 680 400 Z" fill="#B9B4AC" />
      <motion.g initial={false} animate={{ opacity: happy ? 0 : 1 }} transition={fade}>
        <path
          d="M668 340 L692 334 M710 334 L734 340"
          stroke="#8E8A84"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M688 420 Q700 412 712 420"
          stroke="#7A3E2A"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>
      <motion.g initial={false} animate={{ opacity: happy ? 1 : 0 }} transition={fade}>
        <path
          d="M668 336 Q680 328 692 334 M710 334 Q722 328 734 336"
          stroke="#8E8A84"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M684 414 Q700 436 716 414 Z" fill="#7A3E2A" />
      </motion.g>
      {/* table, notice, cup */}
      <ellipse cx="1080" cy="656" rx="270" ry="58" fill="#5E3F25" />
      <rect x="1066" y="680" width="28" height="176" fill="#5A3A22" />
      <ellipse cx="1080" cy="858" rx="90" ry="14" fill="#5A3A22" />
      <ellipse cx="1080" cy="642" rx="270" ry="58" fill="#7A5236" />
      <polygon
        points="960,632 1110,610 1160,648 1006,672"
        fill="#FFFFFF"
        stroke="#E4DED2"
        strokeWidth="2"
      />
      <path
        d="M984 640 L1100 624 M994 650 L1112 634 M1004 660 L1090 648"
        stroke="#C9C3B6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M1218 566 L1294 566 L1286 630 Q1256 642 1226 630 Z" fill="#FAF8F3" />
      <path
        d="M1292 580 Q1318 584 1314 602 Q1310 616 1288 614"
        stroke="#FAF8F3"
        strokeWidth="9"
        fill="none"
      />
      <ellipse cx="1256" cy="568" rx="36" ry="7" fill="#5A3A22" />
      <g opacity="0.55">
        <path
          d="M1240 548 Q1230 528 1242 510 Q1254 492 1244 472"
          stroke="#FFFFFF"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M1268 552 Q1260 532 1272 514 Q1282 498 1274 480"
          stroke="#FFFFFF"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      {/* near arm: three poses */}
      <motion.g initial={false} animate={{ opacity: pose === "rest" ? 1 : 0 }} transition={fade}>
        <path
          d="M762 470 L800 590 L902 612"
          stroke={SHIRT}
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="900" y="604" width="74" height="26" rx="6" fill="#141A26" />
        <circle cx="912" cy="612" r="19" fill={SKIN} />
      </motion.g>
      <motion.g initial={false} animate={{ opacity: handUp ? 1 : 0 }} transition={fade}>
        <path
          d="M762 470 L800 590 L862 538"
          stroke={SHIRT}
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="866" cy="534" r="19" fill={SKIN} />
        <rect x="856.6" y="450.6" width="64.8" height="90.8" rx="6.5" fill="#141A26" />
        <rect
          x={PHONE_SCREEN.x}
          y={PHONE_SCREEN.y}
          width={PHONE_SCREEN.w}
          height={PHONE_SCREEN.h}
          rx="5"
          fill="#FAF8F3"
        />
        <circle cx="856" cy="520" r="9" fill={SKIN} />
      </motion.g>
      <motion.g initial={false} animate={{ opacity: pose === "ear" ? 1 : 0 }} transition={fade}>
        <path
          d="M762 470 L808 560 L780 410"
          stroke={SHIRT}
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="752" y="330" width="28" height="74" rx="7" fill="#141A26" />
        <circle cx="776" cy="402" r="19" fill={SKIN} />
      </motion.g>
    </svg>
  );
}
