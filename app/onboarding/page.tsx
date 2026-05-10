'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile, usePrograms } from '@/lib/store';
import { UserProfile, ExperienceLevel, Goal } from '@/lib/types';
import { PROGRAM_TEMPLATES } from '@/lib/templates';
import { uid } from '@/lib/utils';
import { generateOnboardingInsights } from '@/lib/ai';
import { ChevronRight, ChevronLeft, Dumbbell, Zap, Target, Loader2 } from 'lucide-react';

const STEPS = ['Profile', 'Max Lifts', 'Program', 'Ready'];

const MAIN_LIFTS = [
  { id: 'squat',    label: 'Back Squat',       placeholder: 'e.g. 225' },
  { id: 'bench',    label: 'Bench Press',       placeholder: 'e.g. 185' },
  { id: 'deadlift', label: 'Deadlift',          placeholder: 'e.g. 315' },
  { id: 'ohp',      label: 'Overhead Press',    placeholder: 'e.g. 135' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { addProgram, setActive } = usePrograms();

  const [step, setStep] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [goal, setGoal] = useState<Goal>('powerbuilding');
  const [daysPerWeek, setDaysPerWeek] = useState<3 | 4>(4);
  const [maxLifts, setMaxLifts] = useState<Record<string, string>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('upper-lower-4day');
  const [claudeApiKey, setClaudeApiKey] = useState('');

  function setLift(id: string, val: string) {
    setMaxLifts(m => ({ ...m, [id]: val }));
  }

  async function handleFinish() {
    const liftNums: Record<string, number> = {};
    for (const [k, v] of Object.entries(maxLifts)) {
      const n = parseFloat(v);
      if (n > 0) liftNums[k] = n;
    }

    const profile: UserProfile = {
      name: name.trim() || 'Athlete',
      age: parseInt(age) || 25,
      weight: parseFloat(weight) || 180,
      height: parseInt(height) || 70,
      experience,
      goal,
      maxLifts: liftNums,
      daysPerWeek,
      onboardingComplete: true,
      claudeApiKey: claudeApiKey.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Try AI insight
    if (claudeApiKey.trim()) {
      setAiLoading(true);
      try {
        const insight = await generateOnboardingInsights(profile, claudeApiKey.trim());
        setAiInsight(insight);
      } catch { setAiInsight(''); }
      setAiLoading(false);
    }

    setProfile(profile);

    // Add selected template as active program
    const template = PROGRAM_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (template) {
      const copy = {
        ...template,
        id: uid(),
        createdAt: new Date().toISOString(),
        days: template.days.map(d => ({ ...d, id: uid() })),
      };
      addProgram(copy);
      setActive(copy.id);
    }

    router.push('/');
  }

  const canNext = [
    name.trim().length > 0 && age && weight,
    true, // maxlifts optional
    selectedTemplateId !== '',
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-8">
          <Dumbbell size={24} className="text-orange-500" />
          <span className="text-xl font-black tracking-tight">Iron Log</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-orange-500' : 'bg-zinc-700'}`} />
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-orange-500' : 'bg-zinc-700'}`} />}
            </div>
          ))}
          <span className="text-xs text-zinc-500 ml-2">{STEPS[step]}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-black mb-1">Let's get started</h1>
              <p className="text-zinc-500 text-sm">Tell us about you so we can build your program.</p>
            </div>

            <Field label="Name">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" className={inputCls} />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Age">
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="25" className={inputCls + ' no-spin'} />
              </Field>
              <Field label="Weight (lbs)">
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="180" className={inputCls + ' no-spin'} />
              </Field>
              <Field label="Height (in)">
                <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                  placeholder="70" className={inputCls + ' no-spin'} />
              </Field>
            </div>

            <Field label="Experience Level">
              <div className="grid grid-cols-3 gap-2">
                {(['beginner','intermediate','advanced'] as ExperienceLevel[]).map(e => (
                  <button key={e} onClick={() => setExperience(e)}
                    className={`py-2.5 rounded-xl text-sm font-bold capitalize border transition-colors ${experience === e ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Primary Goal">
              <div className="grid grid-cols-3 gap-2">
                {([['strength','Strength'],['powerbuilding','Power­building'],['hypertrophy','Hypertrophy']] as [Goal,string][]).map(([g, label]) => (
                  <button key={g} onClick={() => setGoal(g)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${goal === g ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Training Days / Week">
              <div className="grid grid-cols-2 gap-3">
                {([3,4] as (3|4)[]).map(d => (
                  <button key={d} onClick={() => setDaysPerWeek(d)}
                    className={`py-3 rounded-xl font-black text-lg border transition-colors ${daysPerWeek === d ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                    {d} Days
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-black mb-1">Your Max Lifts</h1>
              <p className="text-zinc-500 text-sm">Enter your 1-rep maxes (or best estimate). We'll calculate your working weights from these.</p>
            </div>

            {MAIN_LIFTS.map(lift => (
              <Field key={lift.id} label={`${lift.label} 1RM (lbs)`}>
                <input type="number" value={maxLifts[lift.id] ?? ''}
                  onChange={e => setLift(lift.id, e.target.value)}
                  placeholder={lift.placeholder}
                  className={inputCls + ' no-spin'} />
              </Field>
            ))}

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                <span className="text-orange-400 font-semibold">Don't know your maxes?</span> That's fine — enter your best estimated numbers or skip this step. You can always update them later in Settings. We'll use them to calculate your starting weights using RPE percentages.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-black mb-1">Choose Your Program</h1>
              <p className="text-zinc-500 text-sm">Select the training split that fits your schedule.</p>
            </div>

            <div className="space-y-3">
              {PROGRAM_TEMPLATES.filter(t => t.daysPerWeek <= daysPerWeek || t.id === 'upper-lower-4day').map(template => (
                <button key={template.id} onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full text-left bg-zinc-900 border rounded-2xl p-4 transition-colors ${selectedTemplateId === template.id ? 'border-orange-500/60' : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold">{template.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{template.daysPerWeek} days/week</p>
                      <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{template.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-3 mt-0.5 flex items-center justify-center ${selectedTemplateId === template.id ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`}>
                      {selectedTemplateId === template.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {template.days.map(d => (
                      <span key={d.id} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">{d.name}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <Field label="Claude API Key (optional — enables AI coaching)">
              <input type="password" value={claudeApiKey} onChange={e => setClaudeApiKey(e.target.value)}
                placeholder="sk-ant-..." className={inputCls} />
              <p className="text-xs text-zinc-600 mt-1">Used for readiness feedback, weekly analysis, and program adjustments. Stored locally only.</p>
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black mb-2">You're all set, {name || 'Athlete'}!</h1>
              <p className="text-zinc-500 text-sm">Your program is ready. Time to build.</p>
            </div>

            {aiLoading && (
              <div className="flex items-center justify-center gap-2 text-zinc-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Generating your AI coaching notes...</span>
              </div>
            )}

            {aiInsight && (
              <div className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-orange-400" />
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">AI Coach</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{aiInsight}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { label: 'Program', value: PROGRAM_TEMPLATES.find(t => t.id === selectedTemplateId)?.name ?? '—' },
                { label: 'Goal', value: goal.charAt(0).toUpperCase() + goal.slice(1) },
                { label: 'Days / Week', value: `${daysPerWeek} days` },
                { label: 'AI Coaching', value: claudeApiKey ? 'Enabled' : 'Disabled' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-xs text-zinc-600">{label}</p>
                  <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-8 flex gap-3">
        {step > 0 && step < 3 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 border border-zinc-700 text-zinc-400 font-bold py-4 px-5 rounded-2xl hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={18} />
          </button>
        )}

        {step < 2 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
            Continue
            <ChevronRight size={20} />
          </button>
        ) : step === 2 ? (
          <button onClick={() => { setStep(3); handleFinish(); }}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
            Build My Program
            <Zap size={20} />
          </button>
        ) : (
          <button onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
            Start Training
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-600';
