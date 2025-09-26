import { useMemo } from 'react';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { Icon, type IconName } from '../../components/ui/Icon';
import '../../components/ui/ui.css';

const steps: Array<{ title: string; description: string; icon: IconName }> = [
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
  const { step, setStep, completed, complete } = useOnboardingState();

  const progress = useMemo(() => (completed ? 100 : (step / steps.length) * 100), [step, completed]);

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
        {steps.map((stepConfig, index) => {
          const current = index + 1;
          const isUnlocked = step >= current || completed;
          const isActive = step === current && !completed;
          return (
            <article key={stepConfig.title} className={`card dense ${isActive ? 'active-step' : ''}`}>
              <div className="tag">
                <Icon name={stepConfig.icon} /> Step {current}
              </div>
              <h3>{stepConfig.title}</h3>
              <p>{stepConfig.description}</p>
              <button
                className={`chip ${isUnlocked ? '' : 'ghost'}`}
                onClick={() =>
                  completed
                    ? null
                    : isUnlocked
                    ? setStep(Math.min(steps.length, current + 1))
                    : setStep(current)
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
      {!completed && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="chip" onClick={complete}>
            Complete onboarding
            <Icon name="check" />
          </button>
        </div>
      )}
    </div>
  );
};
