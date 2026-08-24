# R4–R8 release evidence

This tracked directory contains machine-verifiable release decisions, not plans
or blank templates. `schema.json` defines the record. Do not create a `go`
record without genuine evidence and named sign-offs.

Expected records are `R4.json` through `R8.json` when those stages are actually
decided. R6–R8 may scope live AI or payments to `false`; that does not make R4
or R5 live. Corrections append a new release ID rather than rewriting history.

Run `npm run verify:r4-r8-release` to require five valid records. Until real
records exist, that command must fail and the related features remain disabled.
