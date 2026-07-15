import csv
import tempfile
import unittest
from pathlib import Path

from scripts.build_data import DEFAULT_INPUT, build_dataset, parse_price


class BuildDataTests(unittest.TestCase):
    def test_price_ranges(self):
        self.assertEqual(parse_price("200-400"), (200.0, 400.0, 300.0))
        self.assertEqual(parse_price("฿1,000+"), (1000.0, 1000.0, 1000.0))
        self.assertIsNone(parse_price("unknown"))

    def test_current_canonical_source_is_valid(self):
        records, report, errors = build_dataset(DEFAULT_INPUT)
        self.assertEqual(errors, [])
        self.assertTrue(report["valid"])
        self.assertEqual(len(records), 199)
        self.assertEqual(len({item["url"] for item in records}), 199)
        self.assertTrue(all(0 <= item["rating"] <= 5 for item in records))
        self.assertRegex(report["source_modified_date"], r"^\d{4}-\d{2}-\d{2}$")
        self.assertTrue(all("price_min" in item and "price_max" in item for item in records))

    def test_duplicate_url_fails_validation(self):
        fields = [
            "name", "lat", "lon", "rating", "review_count", "primary_cuisine",
            "cuisine_subtype", "price_level", "address", "url", "image_url",
        ]
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "restaurants.csv"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                for name in ("A", "B"):
                    writer.writerow({
                        "name": name,
                        "lat": 13.75,
                        "lon": 100.50,
                        "rating": 4.5,
                        "review_count": 10,
                        "primary_cuisine": "Sichuan",
                        "cuisine_subtype": "Hotpot",
                        "price_level": "200-400",
                        "address": "Bangkok",
                        "url": "https://maps.example/same",
                        "image_url": "https://images.example/a.jpg",
                    })
            _, _, errors = build_dataset(source)
            self.assertTrue(any("duplicate url" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
