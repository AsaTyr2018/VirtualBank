import { useMemo } from 'react';
import { useExperienceStore } from '../../hooks/useExperienceStore';
import { Icon } from '../../components/ui/Icon';
import '../../components/ui/ui.css';

const steps = [
  {
    title: 'Choose your vibe',
    description: 'Tell us if you want to play as a Player, Game Master, or Observer to unlock tailored missions.',
    icon: 'sparkles'
  },
  {
    title: 'Connect your vaults',
    description: 'Create your fun-currency vaults and decide which friends can send you boosts or rewards.',
    icon: 'gift'
  },
  {
    title: 'Dial in notifications',
    description: 'Select celebration styles, safety alerts, and weekly recap digests to stay in the loop.',
    icon: 'bell'
  }
];

export const Onboarding = () => {
  const { onboardingStep, setOnboardingStep, onboardingCompleted, completeOnboarding } = useExperienceStore();

  const progress = useMemo(() => (onboardingCompleted ? 100 : (onboardingStep / steps.length) * 100), [
    onboardingStep,
    onboardingCompleted
  ]);

  return (
    <div className="card">
      <div className="section-title">
        <div>
          <h2>Welcome to VirtualBank</h2>
          <p>Your guided launchpad to the most joyful banking playground.</p>
        </div>
        <div className="badge">
          <Icon name="sparkles" />
          {Math.round(progress)}% complete
        </div>
      </div>
      <div className="grid three">
        {steps.map((step, index) => {
          const current = index + 1;
          const isUnlocked = onboardingStep >= current || onboardingCompleted;
          const isActive = onboardingStep === current && !onboardingCompleted;
          return (
            <article key={step.title} className={`card dense ${isActive ? 'active-step' : ''}`}>
              <div className="tag">
                <Icon name={step.icon} /> Step {current}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <button
                className={`chip ${isUnlocked ? '' : 'ghost'}`}
                onClick={() =>
                  onboardingCompleted
                    ? null
                    : isUnlocked
                    ? setOnboardingStep(Math.min(steps.length, current + 1))
                    : setOnboardingStep(current)
                }
              >
                {isUnlocked ? 'Continue' : 'Preview'}
                <Icon name="arrowRight" />
              </button>
            </article>
          );
        })}
      </div>
      <div className="timeline" style={{ marginTop: '2rem' }}>
        <div className="timeline__item">
          <div className="timeline__icon">✨</div>
          <div>
            <strong>Progress sync</strong>
            <p>All onboarding choices instantly sync with your dashboard preferences.</p>
          </div>
        </div>
        <div className="timeline__item">
          <div className="timeline__icon">🛡️</div>
          <div>
            <strong>Safety net</strong>
            <p>We surface access controls, privacy nudges, and review timers along the way.</p>
          </div>
        </div>
        <div className="timeline__item">
          <div className="timeline__icon">🎉</div>
          <div>
            <strong>Celebrate completion</strong>
            <p>Finish all steps to unlock the "Launch Party" badge and starter quests.</p>
          </div>
        </div>
      </div>
      {!onboardingCompleted && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="chip" onClick={completeOnboarding}>
            Complete onboarding
            <Icon name="check" />
          </button>
        </div>
      )}
    </div>
  );
};
