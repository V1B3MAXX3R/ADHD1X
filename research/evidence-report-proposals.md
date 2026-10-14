# What the ADHD and Autism Report Means for ADHD1X

**Version 1.1.1** (2026-10-10)

Status: the 8 features in section 3 were **approved by Christian on 2026-10-10** (A60 to A67; fun facts show in Space mode only). The fixes, policies and UI changes were approved the same day (A68 to A77). Only the open question on study-science fun facts remains in [decision-log.md](../instructions/decision-log.md). Planning only, no code (A2).

Source: [ADHD and Autism: An Evidence Report](https://claude.ai/code/artifact/93d76cd1-8565-4d79-8d36-42327f50c6a5) (2026-10-10, 67 sources). Evidence labels below match the report: Strong, Moderate, Limited, Contested, Lived experience.

**The filter used:** ADHD1X is a school helper. Its MVP is starting tasks and an automatic day plan (A32), and success means better grades and more on-time work (A33). A finding only made it in here if it helps a student start, plan, finish or recover, and if it fits the rules already set: diagnosis-free (A11), no guilt or commitment mechanics (A5, A25), presets only (A26), and not therapy (A6, A23).

---

## 1. The report in 12 lines

1. ADHD and autism are common, mostly heritable, lifelong conditions that often occur together; about 28% of autistic people also have ADHD. **Strong**
2. The most consistent thinking difference is in executive function: planning, starting, holding steps in mind. Not everyone has it, but it's the most common. **Moderate**
3. No quiz, scan or questionnaire diagnoses either one. Popular screeners miss many people and flag many who don't have the condition. **Strong**
4. Girls, women and adults are often diagnosed late or missed, partly because they mask. **Moderate**
5. Masking and autistic burnout are widely described: exhaustion, needing recovery time, losing skills under too much demand. **Lived experience**, with qualitative research behind it
6. Autistic people often communicate more easily with each other; clear, explicit instructions reduce misunderstandings (double empathy). **Moderate**
7. ADHD medication works best for core symptoms in the short term; that's a clinician's area, not an app's. **Strong**
8. Many popular non-drug fixes (neurofeedback, brain training, special diets) shrink to nothing when raters don't know who got treatment. **Strong** that the effect disappears
9. Popular pop-science ideas ("dopamine deficiency," "interest-based nervous system") have no solid research base. **Contested / unsupported**
10. 52% of top #adhd TikTok videos were misleading. **Moderate**
11. Late diagnosis often brings relief and then grief; stigma makes people hide. **Lived experience**
12. Access to assessment is uneven; many users will have no diagnosis at all. **Strong**

---

## 2. Pick and choose: what to keep, fix, remove and add

### Keep (the report backs these)

| Feature or rule | Why the report supports it |
|---|---|
| Diagnosis-free design (A11) | Access is uneven and many users won't have a diagnosis; screeners are unreliable |
| Quiz is about preferences, not symptoms (A7, A20) | Screener-style questions would act like a bad diagnostic test |
| MVP on starting tasks and a premade day plan (A32) | Matches the most consistent finding: executive function differences |
| Burnout safeguards: load shown first, breaks on, no two long days in a row (A41) | Matches burnout and masking accounts |
| Low-stimulation theme (A35) | Sensory differences are part of the autism criteria (DSM-5 B4) |
| No guilt, streaks or commitment (A5, A25) | Matches stigma and shame findings; keeps the app safe for late-diagnosed users |
| Gentle switch line shown once (A59) and "Your call" wording (A46) | Matches the no-blame tone the lived-experience research asks for |

### Fix

| What | Problem | Proposed fix |
|---|---|---|
| Q22 (does switching tasks reduce brain fog?) | The report found no study that meets A34 | Close Q22 as "not met"; A46 wording stays as approved (T24) |
| Help me start doc, step 5 rationale | Cites the Ovsiankina effect, which the report didn't verify; R1 (Zeigarnik) was already rejected for a similar reason | Drop the Ovsiankina line from the rationale. The timer stays, since features don't need a claim (A23) (T25) |
| Help me start doc, step 4 rationale | Implementation intentions figure (d about .65) is marked "from memory" | Verify against Gollwitzer & Sheeran 2006 before any app copy uses it (T25) |
| R1 and R3 are still "proposed rejection" | The report confirms neither has a research base | Make both final (T26) |
| Tips library (T10) | Risk of drifting into health advice | Tips cover study, planning and environment only. Never medication, supplements, diets or neurofeedback, which the report shows are clinician territory or don't hold up (T27) |

### Remove (or never add)

| What | Why |
|---|---|
| Any "ADHD mode" or "autism mode" label, or anything inferring a condition from use | Breaks A11; the report shows labels can't be read off behavior |
| "Superpower" framing in any copy | Minimizes real difficulties; the report shows strong disagreement in lived accounts |
| Quiz questions worded like the ASRS or AQ screeners | They'd turn a preference quiz into a weak screening test (T28) |
| Scary statistics (mortality, risk numbers) anywhere in the app | True but not useful for studying; could cause distress |

---

## 3. Features we could add

All stay inside the school-helper plan. Each one is a proposal.

| # | Feature | What it does | Why (evidence) | Fits |
|---|---|---|---|---|
| T29 | **Make it clear** preset | Gemini rewrites an assignment's instructions as a short checklist: what to hand in, format, length, due date, how it's graded. Shown for review, never saved without a tap | Explicit instructions reduce misunderstandings (double empathy, Moderate); helps planning (executive function, Moderate) | A26 preset, A50 details box |
| T30 | **Message my professor** preset | Drafts a short, polite email asking for clarification or an extension. The user edits and sends it themselves; the app never sends anything | Social communication load; reaching out early helps on-time work (A33) | A26, A4 |
| T31 | **Where was I?** note | When stopping a task, an optional one-line note ("next: write paragraph 2") shows next time you open it | Working memory is a common executive function difference (Moderate) | Help me start |
| T32 | **Heads-up before changes** | Optional 5-minute notice before a study block ends or the plan re-sorts | Insistence on sameness and distress at sudden change (DSM-5 B2, Strong as a criterion) | A44, A45 |
| T33 | **Energy check, optional** | When building today's plan, one optional question: "Low, okay or good energy?" Low suggests one block and lighter tasks. Never asked daily, never tracked as a streak | Burnout accounts (Lived experience); A41 safeguards | A41, A25 |
| T34 | **Campus support page** | A plain page explaining that colleges have disability services and accommodations (extra time, quiet rooms), with a reminder that no diagnosis is needed to ask what's available. Information only, no advice | Access is uneven; many students don't know these exist (Strong on access gaps) | A6 |
| T35 | **Evidence badges on tips** | Each tip shows "Tested in studies" or "Students say this helps" | Mirrors A34; protects against misleading social-media style tips | T10 |
| T36 | **Fun facts** | Short facts about learning, history and neurodiversity, shown only in Space mode (never Regular) after finishing a task or while loading. Can be turned off | A23 allows a few features just for appeal; facts are sourced (see section 6) | A23, A57 |

---

## 4. UI changes

| # | Change | Why |
|---|---|---|
| T37 | **Predictable layout**: navigation never moves; nothing rearranges without the user's action; new things are announced in one line | Change and unpredictability are stressful for many autistic people (DSM-5 B2); also WCAG 3.2 |
| T38 | **Sensory controls in settings**: motion off, sounds off, notification batching (one summary instead of many pings), dim mode | Sensory over-reactivity is in the autism criteria (Strong as a criterion); WCAG 2.3.3 |
| T39 | **Timer display choice**: countdown number, shrinking bar, or hidden | Some people find a visible countdown stressful, others need it (Lived experience) |
| T40 | **Plain words in the UI**: "tasks," "plan," "help," never "symptoms," "disorder" or "deficit" | Language section of the report; keeps the app diagnosis-free |
| (L2 in T15) | **One thing at a time home screen** as an option | Already proposed in personalization levers; the report's executive function findings back it |

---

## 5. Policy propositions

| # | Proposition |
|---|---|
| T27 | Tips and Gemini output never give medical, medication, supplement or diet advice. If a user asks, the preset answers with one line pointing to a clinician or campus health service |
| T28 | Every quiz question gets checked against the ASRS and AQ before approval; nothing that reads like a symptom checklist |
| T41 | Fun facts follow strict rules: sourced from the report, Strong or Moderate evidence (or clearly labeled history), no mortality or scary statistics, no "superpower" claims, no diagnosis hints |

---

## 6. Fun facts library (draft v1)

Rules for every fact: true, sourced, about learning, the brain in general, history, or neurodiversity culture; never a health claim, never a scary number, never "you might have X." Each fact has a short version for the app and its source. Report source numbers in brackets.

### History

| # | Fact (as it would appear) | Source |
|---|---|---|
| FF1 | Doctors were writing about attention problems back in the 1700s. Alexander Crichton described a "disease of attention" in 1798. | Martinez-Badía & Martinez-Raga 2015 [56] |
| FF2 | Autism was first described in a medical paper in 1943. The first child in it, Donald, grew up and lived into old age in Mississippi. | Kanner 1943 [55]; Donvan & Zucker 2010 via PBS [58] |
| FF3 | The term "ADHD" is younger than you might think. It first appeared in 1987. | Martinez-Badía & Martinez-Raga 2015 [56] |
| FF4 | The word "neurodiversity" spread in the late 1990s, shaped by autistic people talking online. Judy Singer's 1998 thesis made it famous. | The 19th 2024 [63] |
| FF5 | In 1993, autistic writer Jim Sinclair published "Don't Mourn for Us," one of the first essays where autistic people spoke for themselves. | Sinclair 1993 [60] |
| FF6 | Since 2013, doctors have been allowed to diagnose ADHD and autism together. Before that, the rules said pick one. | DSM-5 via Psych Central [1] |

### How brains and communication work

| # | Fact | Source |
|---|---|---|
| FF7 | In one experiment, stories passed along a chain of autistic people stayed just as accurate as in a chain of non-autistic people. Mixed chains lost the most detail. Communication styles matter on both sides. | Crompton et al. 2020 [49] |
| FF8 | "Double empathy" is the idea that misunderstandings between different kinds of thinkers go both ways, not just one. | Milton 2012 [50] |
| FF9 | No brain scan can tell whether someone has ADHD. Average brain differences in big studies are tiny. | Hoogman et al. 2017 [34] |
| FF10 | Thousands of genes each play a tiny part in how attention works. There's no single "attention gene." | Demontis et al. 2023 [32]; Faraone & Larsson 2019 [20] |
| FF11 | Being the youngest in your class makes kids more likely to be labeled with attention problems, because a few months of age matters a lot when you're 6. | Whitely et al. 2019 [27] |

### Myth busters

| # | Fact | Source |
|---|---|---|
| FF12 | Vaccines don't cause autism. A study of over 650,000 Danish children found no link. | Hviid et al. 2019 [35] |
| FF13 | Autism was once blamed on "cold" parents. That idea was wrong and has been abandoned. | Lord et al. 2022 [4]; Bai et al. 2019 [31] |
| FF14 | When researchers checked who knew which kids got "brain training," most of the benefit disappeared. Good science checks for that. | Sonuga-Barke et al. 2013 [12] |
| FF15 | About half of the top #adhd TikTok videos in one study were misleading. Check where your tips come from. | Yeung et al. 2022 [52] |
| FF16 | Online "Am I autistic?" quizzes aren't diagnoses. Even the questionnaires clinics use miss lots of people. | Ashwood et al. 2016 [45]; Guthrie et al. 2019 [44] |

### People and community

| # | Fact | Source |
|---|---|---|
| FF17 | Lots of adults find out they're autistic or have ADHD later in life. It's common, not weird. | Long & Coats 2022 [29]; Young et al. 2020 [5] |
| FF18 | Many autistic adults prefer "autistic person," while many professionals say "person with autism." Asking someone what they prefer is always fine. | Kenny et al. 2016 [51] |
| FF19 | Women and girls are often recognized later, partly because they learn to hide their differences. | Hull et al. 2017 [47]; Young et al. 2020 [5] |
| FF20 | Colleges have disability services that can arrange things like extra time or a quieter exam room. | General campus practice; see T34 |

**Not included on purpose:** mortality numbers, risk statistics, medication facts, "famous people who had ADHD" lists (usually unverifiable guesses), and anything about the 2025 acetaminophen or leucovorin news (contested and upsetting, not useful for studying).

**Needs Christian's call:** should fun facts also cover general study science (like how spacing out review beats cramming)? Those would need their own sources checked first, since this report didn't cover them.
