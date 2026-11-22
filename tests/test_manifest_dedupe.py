#!/usr/bin/env python3
"""Standalone guard: main manifest is one-entry-per-site, selectable, hash-consistent. Run: python3 tests/test_manifest_dedupe.py"""
import hashlib, json, os, unittest
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def J(n):
    with open(os.path.join(R, n), encoding="utf-8") as f: return json.load(f)

def _rb(p):
    with open(p, "rb") as f: return f.read()

class T(unittest.TestCase):
    def setUp(self):
        self.m = J("manifest.all-sources.json"); self.s = self.m["scrapers"]; self.main = J("manifest.json")["scrapers"]
        self.c = J("CANONICAL.json"); self.src = {x["file"]: x for x in J("SOURCES.json")}
    def test_ids_unique(self):
        ids = [x["id"] for x in self.s]; self.assertEqual(len(ids), len(set(ids)))
    def test_all_selectable(self):
        self.assertTrue(all(x["enabled"] is True for x in self.s))
    def test_files_and_hashes(self):
        for x in self.s:
            p = os.path.join(R, x["filename"]); self.assertTrue(os.path.isfile(p), x["id"])
            self.assertEqual(hashlib.sha256(_rb(p)).hexdigest(), self.src[x["filename"]]["vendoredSha256"], x["id"])
    def test_groups_kept_present_removed_absent(self):
        ids = {x["id"] for x in self.s}
        for g in self.c["groups"]:
            self.assertIn(g["keptId"], ids)
            for r in g["removedIds"]: self.assertNotIn(r, ids)
        self.assertEqual(self.c["after"], len(self.s))
        self.assertEqual(self.c["before"] - self.c["after"], sum(len(g["removedIds"]) for g in self.c["groups"]))
    def test_alternates_are_exactly_removed(self):
        alt = {x["id"] for x in J("manifest.alternates.json")["scrapers"]}
        self.assertEqual(alt, {r for g in self.c["groups"] for r in g["removedIds"]})
        self.assertFalse(alt & {x["id"] for x in self.s})
    def test_verified_subset_kept(self):
        ids = {x["id"] for x in self.s}
        for x in J("manifest.verified.json")["scrapers"]: self.assertIn(x["id"], ids)
    def test_no_variant_suffix_in_names(self):
        for x in self.s: self.assertNotRegex(x["name"].lower(), r"\((wekmed|mooncrown|anthology)\)|turkish-nuvio\)") if x["id"] in {g["keptId"] for g in self.c["groups"]} else None
    def test_main_manifest_is_cizgimax_only(self):
        # Ana manifest yalnızca ÇizgiMax; kaldırılan kaynaklar için bkz. test_removed_sources.py.
        self.assertEqual([x["id"] for x in self.main], ["cizgimax-wekmed"])
        self.assertTrue(all(x["enabled"] is True for x in self.main))
        full = {x["id"]: x for x in self.s}
        self.assertEqual(len(full), 59)
        self.assertEqual(self.main[0]["version"], "1.0.6")
        for x in self.main: self.assertEqual(x, full[x["id"]])
        self.assertEqual(J("manifest.json")["version"], J("manifest.all-sources.json")["version"])
        for x in self.main:
            self.assertEqual(hashlib.sha256(open(os.path.join(R, x["filename"]), "rb").read()).hexdigest(), self.src[x["filename"]]["vendoredSha256"])
    def test_all_sources_reference_existing_files(self):
        for x in self.s: self.assertTrue(os.path.isfile(os.path.join(R, x["filename"])), x["id"])
if __name__ == "__main__": unittest.main()
