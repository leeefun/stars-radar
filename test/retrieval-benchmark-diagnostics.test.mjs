import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalExpected,
  canonicalRepo,
  corpusRepoKeys,
  goldRank,
  summarize,
} from '../scripts/evaluate_retrieval_real.js'

const aliases = { 'old-owner/renamed-repo': 'new-owner/renamed-repo' }

test('renamed repositories resolve through the alias map, case-insensitively', () => {
  assert.equal(canonicalRepo('Old-Owner/Renamed-Repo', aliases), 'new-owner/renamed-repo')
  assert.equal(canonicalRepo('unrelated/repo', aliases), 'unrelated/repo')
  assert.deepEqual(
    canonicalExpected(['OLD-OWNER/RENAMED-REPO', 'other/repo'], aliases),
    ['new-owner/renamed-repo', 'other/repo'],
  )
})

test('goldRank reports the 1-based position and null when the gold is absent', () => {
  assert.equal(goldRank(['a/one', 'b/two'], ['B/Two']), 2)
  assert.equal(goldRank(['a/one'], ['b/two']), null)
  assert.equal(goldRank([], ['b/two']), null)
})

test('corpusRepoKeys unions catalogue keys with the canonical repo field', () => {
  const keys = corpusRepoKeys(
    { repos: { 'owner/starred': { repo: 'Owner/Starred' } } },
    { repos: { 'owner/asset': { repo: 'Owner/Asset' } } },
  )
  assert.deepEqual([...keys].sort(), ['owner/asset', 'owner/starred'])
})

test('summarize surfaces cases whose gold is missing from the corpus', () => {
  const metric = {
    has_relevant: true,
    recall_at_k: 1,
    precision_at_k: 0.1,
    reciprocal_rank: 1,
    ndcg_at_k: 1,
    evidence_coverage_rate: 1,
    provenance_completeness_rate: 1,
    empty_success: null,
    forbidden_hits: [],
  }
  const rows = [
    { id: 'reachable', gold_missing: [], gold_rank: 1, metrics: metric, latency_ms: 10 },
    { id: 'renamed', gold_missing: ['old-owner/repo'], gold_rank: null, metrics: { ...metric, recall_at_k: 0, reciprocal_rank: null }, latency_ms: 10 },
  ]
  const summary = summarize(rows)
  assert.equal(summary.unreachable_gold_cases, 1)
  assert.deepEqual(summary.unreachable_gold_ids, ['renamed'])
})
