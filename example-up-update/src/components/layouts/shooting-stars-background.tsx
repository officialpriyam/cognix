import type { CSSProperties } from "react";

const shootingStars = [
  {
    top: "8%",
    left: "-12%",
    delay: "0s",
    duration: "7.5s",
    length: "7rem",
    travelX: "135vw",
    travelY: "54vh",
  },
  {
    top: "18%",
    left: "22%",
    delay: "2.4s",
    duration: "9s",
    length: "5.5rem",
    travelX: "92vw",
    travelY: "38vh",
  },
  {
    top: "5%",
    left: "62%",
    delay: "5.8s",
    duration: "8.2s",
    length: "6.5rem",
    travelX: "62vw",
    travelY: "48vh",
  },
  {
    top: "36%",
    left: "-18%",
    delay: "4.1s",
    duration: "10s",
    length: "8rem",
    travelX: "138vw",
    travelY: "62vh",
  },
  {
    top: "52%",
    left: "12%",
    delay: "8.6s",
    duration: "11s",
    length: "4.75rem",
    travelX: "118vw",
    travelY: "44vh",
  },
  {
    top: "72%",
    left: "-10%",
    delay: "6.3s",
    duration: "9.6s",
    length: "6rem",
    travelX: "120vw",
    travelY: "34vh",
  },
];

export function ShootingStarsBackground() {
  return (
    <div className="shooting-stars-layer" aria-hidden="true">
      {shootingStars.map((star) => (
        <span
          key={`${star.top}-${star.delay}`}
          className="shooting-star"
          style={
            {
              "--star-top": star.top,
              "--star-left": star.left,
              "--star-delay": star.delay,
              "--star-duration": star.duration,
              "--star-length": star.length,
              "--star-travel-x": star.travelX,
              "--star-travel-y": star.travelY,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
