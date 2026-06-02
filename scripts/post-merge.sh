#!/bin/bash
set -e

# This project does not own its database schema — Supabase (analytics.*,
# competitive.*, etc.) is managed externally by the producer repos
# (nsd-integrations, etc.). There is no local migration step.
npm install --no-audit --no-fund
