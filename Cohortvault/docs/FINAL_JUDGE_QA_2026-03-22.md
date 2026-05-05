# CohortVault Judge Q&A

Use this sheet for live judging, office hours, or submission follow-up.

The goal is to sound:

- technically solid
- honest
- product-minded

## 1. What is CohortVault in one sentence?

`CohortVault is a controlled AI workspace where teams can work on sensitive documents with role-aware access, delegated secrets, signed receipt v1 records, and reviewer-safe outputs.`

## 2. What problem are you solving?

`Teams already use AI on private strategy docs, research notes, and API-backed workflows, but the default path is unsafe. Sensitive materials get pasted into general tools, secrets are shared informally, and there is no durable record of what the system touched or how a result was produced.`

## 3. Why is this a Shape Rotator project instead of a generic AI app?

`Because the project is built around trust-boundary ideas from the research rather than just adding a chatbot to documents. We translated those ideas into product behavior: delegated secret use, role-aware disclosure, explicit runtime receipts, reviewable provenance, and honest separation between TEE-ready architecture and real attestation.`

## 4. Which papers influenced the project most directly?

`The strongest influences are Conditional Recall, Props, and work on narrowing the gap between TEE threat models and deployment realities. Conditional Recall informed delegated access and revocation. Props informed controlled access to sensitive data without broad exposure. Narrowing the Gap shaped our explicit trust model and the decision not to overclaim attestation.`

## 5. What is actually implemented from those ideas?

`Three concrete things are implemented. First, delegated secret usage with revocation and denial on later runs. Second, viewer-specific disclosure, where reviewers can inspect outputs and receipts without seeing full sensitive inputs. Third, durable signed receipts that bind runtime metadata, source scope, and policy metadata into a verifiable record.`

## 6. Is this using a real TEE today?

`No. The current build is TEE-ready, not TEE-backed. We have a receipt abstraction and an explicit provider model, but the default path is an application-level signed runtime, not SGX, Nitro, or dstack-backed attestation.`

## 7. Why should judges still care if it is not a real TEE yet?

`Because one of the hard problems in this space is turning trust-boundary ideas into a usable product. We wanted to prove that role-aware secure AI collaboration is useful and understandable today, while keeping the interface clean enough to swap in a real TEE backend later.`

## 8. What does the signed receipt prove?

`It proves that the persisted payload has not been tampered with after signing and that the run metadata, policy hash, provider metadata, and source scope were bound together into a durable record. It does not prove hardware attestation.`

## 9. What does the signed receipt not prove?

`It does not prove enclave execution, remote attestation, SGX/Nitro/dstack identity, or hardware-backed confidentiality.`

## 10. How is this different from normal RAG?

`Normal RAG usually stops at retrieval plus generation. CohortVault adds role-aware viewing rules, secret delegation, signed runtime receipts, persisted review artifacts, reviewer re-redaction, and audit logs. The output is not just an answer; it is an answer plus a trust surface.`

## 11. How are secrets handled?

`Secrets are workspace-scoped server-side references. The browser never receives the raw value back. If an encryption key is configured, the stored secret value is encrypted at rest. Secret revocation is enforced server-side during Secure Run.`

## 12. What happens when a secret is revoked?

`Future runs that depend on that secret fail. We log the revocation and the denied run. That gives us a visible security control that changes behavior rather than only changing metadata.`

## 13. What is the most technically interesting part of the product?

`The most interesting product-security interaction is the reviewer artifact flow. A persisted run is not simply replayed to every viewer. The backend re-applies answer and source clipping for the current actor, so provenance is preserved without overexposing the original output.`

## 14. Why did you choose this role model?

`Because real teams are not all the same user. Owners manage policy and secrets, builders execute workflows, and reviewers inspect outputs and provenance. That makes the product fit accelerators, labs, and diligence workflows better than a single-user AI tool.`

## 15. What part of the system is still weakest?

`The biggest technical gap is real TEE integration. The biggest deployment gap is that uploads are still stored on local disk, so production-grade object storage is still future work.`

## 16. How production-ready is this?

`It is credible as a hackathon MVP and strong as a product prototype, but not production-ready in the full enterprise sense. The core workflows are real and test-backed, but storage, auth, and true confidential execution still need upgrades.`

## 17. What validation have you done?

`We have passing backend tests covering permissions, receipts, secret revocation, and worker behavior, plus an end-to-end smoke test that exercises workspace creation, document ingestion, secure run, reviewer restrictions, audit retrieval, and denial after revoke.`

## 18. What is the market wedge?

`The wedge is controlled AI collaboration for small technical teams working on sensitive material. That includes startup teams, accelerator cohorts, research groups, and diligence-heavy workflows where people need AI leverage but cannot accept the default copy-paste model.`

## 19. Why could this become a startup?

`Because the pain is immediate, the user is clear, and the workflow is easy to understand. Teams already want AI on sensitive material. What they lack is a product that gives them useful outputs, provenance, reviewability, and revocation without requiring them to become security engineers.`

## 20. What would you build next if accepted into the accelerator?

`The next three upgrades would be real TEE-backed execution and attestation, production storage and secret brokerage, and policy/approval controls for higher-risk workflows. The product surface is already designed to absorb those upgrades without changing how users interact with it.`

## 21. Why did you choose signed receipts instead of waiting for a real enclave integration?

`Because we wanted to avoid fake claims while still making trust visible. Signed receipts let us prove application-level provenance today and prepare a stable interface for stronger evidence later.`

## 22. What is the strongest part of the demo?

`The strongest moment is the full loop: builder runs Secure Run, reviewer sees a clipped artifact, owner revokes the secret, and the next run is denied. That sequence makes the trust boundary concrete.`

## 23. What is the likely hardest judge pushback?

`The hardest pushback is that this is not true attested confidential compute yet. The right answer is to agree with that, then explain that our contribution is turning secure-execution ideas into a usable workflow with explicit trust boundaries and a clear path to real TEE integration.`

## 24. Why not just say this is secure RAG?

`Because that would undersell both the problem and the solution. The product is not only about retrieval quality. It is about controlled disclosure, delegated access, runtime evidence, reviewer-safe collaboration, and explicit trust semantics.`

## 25. Closing Answer If A Judge Asks "Why should this win?"

`Because CohortVault does what good Shape Rotator projects should do: it takes serious privacy and TEE-adjacent ideas out of the paper layer and turns them into a product workflow judges can actually use. It is technically real, honest about its limits, and already shaped like something that could continue beyond the hackathon.`
