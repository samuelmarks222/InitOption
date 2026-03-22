import React from "react";

interface NotificationEffect {
  id: string;
  type: string;
}

interface Props {
  effects: NotificationEffect[];
}

const buildSequence = (count: number, type: "confetti" | "coin") =>
  Array.from({ length: count }, (_, index) => {
    const x = `${(index % 6) * 18 - 24}px`;
    const delay = `${(index % 5) * 45}ms`;
    const rotate = `${(index * 27) % 360}deg`;
    const duration = `${1300 + index * 30}ms`;

    return { key: `${type}-${index}`, x, delay, rotate, duration };
  });

export const NotificationEffectsLayer = ({ effects }: Props) => {
  if (effects.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[220] overflow-hidden">
      {effects.map((effect) => {
        const isWelcome = effect.type === "welcome_bonus";
        const isCoinBurst = effect.type === "referral_commission" || effect.type === "deposit_bonus";
        const particles = buildSequence(isWelcome ? 18 : 12, isCoinBurst ? "coin" : "confetti");

        return (
          <div key={effect.id} className="notification-effect-origin">
            {particles.map((particle, index) =>
              isCoinBurst ? (
                <span
                  key={`${effect.id}-${particle.key}`}
                  className="notification-coin"
                  style={
                    {
                      "--notification-x": particle.x,
                      "--notification-delay": particle.delay,
                      "--notification-rotate": particle.rotate,
                      "--notification-duration": particle.duration,
                    } as React.CSSProperties
                  }
                >
                  {index % 2 === 0 ? "$" : "+"}
                </span>
              ) : (
                <span
                  key={`${effect.id}-${particle.key}`}
                  className="notification-confetti"
                  style={
                    {
                      "--notification-x": particle.x,
                      "--notification-delay": particle.delay,
                      "--notification-rotate": particle.rotate,
                      "--notification-duration": particle.duration,
                      "--notification-color":
                        index % 4 === 0
                          ? "#22c55e"
                          : index % 4 === 1
                            ? "#38bdf8"
                            : index % 4 === 2
                              ? "#f472b6"
                              : "#f59e0b",
                    } as React.CSSProperties
                  }
                />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
};
