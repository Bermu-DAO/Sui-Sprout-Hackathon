# Shape Rotator Hackathon Analysis Report

Date: 2026-03-22

Project: CohortVault

## 1. Executive Summary

CohortVault is a serious and credible submission for the Shape Rotator Virtual Hackathon.

It already demonstrates:

- a real multi-role product workflow
- persistent backend state
- worker-based ingestion
- secure-run style execution controls
- signed execution receipts
- secret revocation and denial paths
- reviewer-safe re-redaction

This is not a toy landing page or a shallow prototype.

My current judgment:

- `top shortlist potential`: yes
- `accelerator fit`: yes
- `real chance to win`: yes, but not as the clear favorite
- `championship probability right now`: medium

The main reason it is not an obvious first-place favorite is that the current implementation is strongest as a `TEE-ready product narrative`, not as a `true TEE system`.

If judges heavily reward:

- product thinking
- research-to-product translation
- polished end-to-end demos
- believable startup potential

then CohortVault can perform very well.

If judges heavily reward:

- actual confidential compute
- real attestation evidence
- direct implementation of a specific TEE paper

then the lack of real TEE integration is the biggest ceiling.

## 2. What The Hackathon Appears To Value

Based on the public Shape Rotator materials and organizer posts:

- it is a `2-week virtual hackathon` running from `March 9, 2026` to `March 23, 2026`
- teams choose from `14 IC3 research papers`
- the goal is to turn research into `working prototypes` and `proofs of concept`
- tracks include:
  - `TEE & AI-enabled applications`
  - `cryptographic primitives & identity`
  - `DeFi, security & mechanism design`
- top teams may be shortlisted into a `14-week Shape Rotator Accelerator`
- graduating accelerator teams may have a path to `$50k+`
- prizes include a `$10k` prize pool

Most important: judging language published by IC3 emphasizes:

- `Technical Rigor`
- `Product Thinking`
- `Market Opportunity`
- `Team & Fit`

That is a very favorable judging frame for this project.

It means the judges are not only asking:

- `Is the cryptography real?`

They are also asking:

- `Did you actually convert research into a product wedge?`
- `Is there a real user?`
- `Could this become a startup or platform?`

## 3. Strategic Fit Of CohortVault

### 3.1 Why it fits well

CohortVault matches the hackathon unusually well on the `research-to-product` axis.

It does not just say:

- private AI
- secure collaboration
- TEE-ready

It turns those ideas into product behaviors:

- role-based access by owner, builder, reviewer
- delegated secret usage
- revocation enforcement
- signed run receipts
- audit history
- viewer-specific re-redaction on read

That is strong evidence of product thinking.

### 3.2 Why it fits the accelerator story

This repo is already positioned like an early B2B infrastructure product:

- startup teams
- accelerators
- hackathon teams
- diligence/reviewer workflows
- controlled use of AI over sensitive documents

That is much easier to imagine in an accelerator than a one-off academic demo.

### 3.3 Where the fit is weaker

The project currently cites several papers and themes, but the implementation reads more like:

- `a synthesis of privacy / trust ideas into a product`

than:

- `a sharp implementation of one paper's core mechanism`

For this event, that is both a strength and a weakness.

Strength:

- stronger product
- broader appeal
- better startup story

Weakness:

- judges may ask exactly which paper contribution is implemented beyond narrative framing

## 4. Verified Repository State

I verified the project locally against the current repo.

### 4.1 Build status

`pnpm build` passed.

### 4.2 API test status

`python -m pytest apps/api/tests -v` passed:

- `24 passed`
- total runtime: `10m 48s`

### 4.3 Smoke test status

`python scripts/smoke_test.py` passed end to end.

Observed flow:

- session switch
- workspace creation
- member invites
- secret creation
- document upload
- worker ingestion
- reindex
- secure run
- receipt retrieval
- secret revocation
- denied run after revoke
- reviewer restrictions
- audit retrieval
- document deletion
- cleanup

Smoke test runtime:

- about `83s`

### 4.4 Important runtime note

The smoke test passed with patched model calls because `COHORTVAULT_API_OPENAI_API_KEY` was not configured in the environment during the test run.

That means:

- the product flow is real
- the system behavior is validated
- but live demo generation still depends on adding an actual OpenAI key

## 5. Strongest Parts Of The Project

### 5.1 End-to-end completeness

This is the strongest quality of the repo.

Many hackathon projects stop at:

- login
- upload
- one chat box
- one static screenshot

CohortVault goes further:

- it persists runs
- it persists receipts
- it persists audit events
- it supports multiple roles
- it re-applies redaction when a different viewer opens an artifact

That is strong `Technical Rigor + Product Thinking`.

### 5.2 Honest security framing

The docs are unusually disciplined about not overclaiming.

That matters because Shape Rotator is explicitly research-driven and likely to include judges who dislike fake security narratives.

The repo repeatedly distinguishes:

- mock signed receipts
- TEE-ready architecture
- real attestation not yet implemented

This is a strategic advantage.

### 5.3 Best product wedge

The clearest memorable wedge is:

- `controlled AI collaboration with reviewer-safe outputs and signed receipts`

That is much more concrete than generic `private AI`.

The most compelling demo moment is not the chat itself.

It is:

1. owner configures workspace and secret
2. builder runs Secure Run
3. reviewer sees clipped artifact
4. owner revokes secret
5. repeated run fails

That is a strong judge-facing narrative.

### 5.4 Accelerator potential

This is easy to imagine evolving into:

- startup diligence tooling
- internal research workspaces
- secure AI collaboration for early-stage teams
- audit/provenance tooling for sensitive workflows

This helps on `Market Opportunity` and `Team & Fit`.

## 6. Biggest Weaknesses

### 6.1 No real TEE execution

This is the single largest weakness.

The code makes it explicit that the so-called TEE path is still a stub:

- `C:\Users\28119\Desktop\cohortvault\apps\api\app\attestation.py:70`
- `C:\Users\28119\Desktop\cohortvault\apps\api\app\attestation.py:243`
- `C:\Users\28119\Desktop\cohortvault\apps\api\app\attestation.py:265`

What exists today is:

- application-level signed receipt logic
- provider metadata
- a TEE-ready abstraction

What does not exist today is:

- enclave proof
- quote verification
- SGX/Nitro/dstack-backed evidence

If another team ships real attestation in the `TEE & AI` track, that team could outrank CohortVault on technical depth.

### 6.2 Deployment path is fragile for public demos

The current upload system stores files on local disk, and object storage is not implemented:

- `C:\Users\28119\Desktop\cohortvault\apps\api\app\storage.py:20`
- `C:\Users\28119\Desktop\cohortvault\apps\api\app\storage.py:52`

This creates a practical problem:

- split API and worker deployments can break ingestion unless they share disk

For a judge demo, that means fresh uploads are riskier than seeded data unless deployment is controlled carefully.

### 6.3 Live Secure Run depends on OpenAI key

The chat path hard-fails when `COHORTVAULT_API_OPENAI_API_KEY` is missing:

- `C:\Users\28119\Desktop\cohortvault\apps\api\app\llm.py:8`

That is fine for development, but it means:

- a final demo environment must be fully provisioned
- otherwise the strongest product moment can fail live

### 6.4 Demo entry friction

The product requires the viewer to pick a demo actor first:

- `C:\Users\28119\Desktop\cohortvault\apps\api\app\main.py:112`
- `C:\Users\28119\Desktop\cohortvault\apps\web\app\login\page.tsx:35`

At the same time, the landing page exposes `Open seeded demo` directly:

- `C:\Users\28119\Desktop\cohortvault\apps\web\app\page.tsx:21`

That creates a small but real demo risk:

- a judge can click into the product before choosing a persona
- then hit an auth/permission wall

For hackathon judging, first-click friction matters.

### 6.5 The research mapping is good, but still somewhat diffuse

The project is informed by multiple papers and themes, which is good for narrative breadth.

But for judges looking for very explicit research implementation, the current pitch may still feel like:

- `strong productization of a research area`

more than:

- `direct implementation of one paper's novel primitive`

## 7. Scorecard Against Likely Judging Criteria

### Technical Rigor: 8.5/10

Why high:

- real backend
- persistent data model
- worker ingestion
- role enforcement
- receipt verification logic
- audit trail
- full API test coverage is meaningful

Why not higher:

- no real TEE evidence
- object storage path not finished

### Product Thinking: 9.0/10

Why high:

- clear user roles
- clear workflow
- clear trust surface
- reviewer artifact is a real product concept

This is arguably the strongest category.

### Market Opportunity: 8.5/10

Why high:

- obvious B2B angle
- accelerators / startup teams / labs are believable early adopters
- strong secure collaboration wedge

Why not higher:

- still early on actual deployment robustness
- some features remain MVP-only or manual

### Team & Fit: 8.0/10

Based on the repo alone, the project shows:

- good system thinking
- good product sense
- solid documentation discipline

This will read positively to judges.

### Overall: 8.5/10

Interpretation:

- strong contender
- very plausible shortlist
- good accelerator candidate
- championship possible, but not guaranteed

## 8. Can It Win?

### Short answer

Yes, it can win.

### More honest answer

It can win if the final submission makes judges believe:

1. this is the best `research-to-product` translation in the cohort
2. this is one of the most polished end-to-end demos
3. the team is unusually honest about trust assumptions
4. the market wedge is stronger than more technically pure but less usable competitors

It is less likely to win if another team delivers:

- a more direct implementation of a TEE paper
- real attestation
- a similarly polished product layer

My current estimate:

- `best-case outcome`: winner or top few
- `most likely outcome right now`: shortlist / strong finalist / accelerator-interest level
- `main blocker to first place`: not enough real TEE substance yet for a track where TEEs are central

## 9. What Would Most Increase The Chance Of Winning

### Priority 1: sharpen the paper mapping

Do not present this as a broad inspiration salad.

Present it as:

- one primary paper influence
- one supporting paper
- one concrete mechanism from each that appears in product logic

Judges should be able to answer:

- `What research idea became what feature?`

in one sentence each.

### Priority 2: make the demo bulletproof

For the final judging demo:

- start on `/login`
- do not start on a page that assumes session state
- use seeded data
- do not depend on fresh uploads unless deployment is hardened
- ensure OpenAI key is configured
- pre-create at least one run artifact for reviewer view

The strongest live sequence is:

1. choose owner
2. open workspace
3. show docs and secret
4. switch to builder
5. run Secure Run
6. open receipt
7. switch to reviewer
8. show clipped artifact
9. switch back to owner
10. revoke secret
11. rerun and show denial

### Priority 3: improve the homepage and public deployment flow

Before judges see this, fix the first-click UX:

- landing page CTA should guide to persona selection first
- seeded demo path should not feel broken before login
- public deployment should be stable and ready

### Priority 4: if possible, add one real TEE-adjacent proof point

Even a partial improvement could materially help:

- real dstack integration
- quote-like evidence from a real provider
- a concrete remote attestation verification step
- or a smaller real confidential compute component in one critical path

This would have outsized judging impact.

### Priority 5: frame the honest limitation as a strength

Do not apologize for not having full TEE support.

Instead say:

- the project solves real collaboration pain today
- it exposes precise trust boundaries
- the abstraction layer is already prepared for real TEE backends
- this is a credible path from research prototype to deployable product

That framing fits the published judging criteria much better than pretending the system is more secure than it is.

## 10. Final Verdict

CohortVault is one of the better kinds of hackathon project:

- technically real
- product-shaped
- test-backed
- honest about limits
- clearly extensible after the event

That already puts it ahead of most flashy but shallow entries.

What stops it from being an obvious champion is not lack of engineering quality.

It is the gap between:

- `TEE-ready`

and:

- `TEE-backed`

If you want the best chance to win, focus the remaining effort on:

1. airtight demo reliability
2. sharper paper-to-feature mapping
3. cleaner public deployment
4. one stronger real TEE signal if feasible

If those are improved, this project absolutely has a credible path to the winner’s circle.
If those are improved, this project absolutely has a credible path to the winner's circle.

## 11. Evidence Collected

### Official / event-adjacent sources

- Encode Club LinkedIn post confirming the event scope, dates, partner set, 14 papers, tracks, and accelerator path:
  - [Encode Club LinkedIn post](https://www.linkedin.com/posts/encode-club_announcing-shape-rotator-virtual-hackathon-activity-7427757784684879873-yeKP)
- IC3 event thread mirror showing judging criteria, prize pool, dates, and presentation day:
  - [IC3 thread mirror on TwStalker](https://mobile.twstalker.com/initc3org)
- Event listing snippet noting the bonus category around privacy-preserving collaboration tools:
  - [Shape Rotator listing mirror](https://telemetr.io/ch/channels/1238775422-visioninbyte)

### Repo validation performed

- `pnpm build`
- `python -m pytest apps/api/tests -v`
- `python scripts/smoke_test.py`
