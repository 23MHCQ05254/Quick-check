"""
Template aggregation engine for learning stable certificate structures.
Combines multiple samples into robust template profiles.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class TemplateAggregator:
    """Aggregate multiple certificate samples into stable template profiles."""

    @staticmethod
    def aggregate_profiles(profiles: list[dict[str, Any]]) -> dict[str, Any]:
        """Combine multiple extraction profiles into a single stable template."""
        if not profiles:
            return {}

        aggregated = {
            "resolution": TemplateAggregator._aggregate_resolution(profiles),
            "dominantColors": TemplateAggregator._aggregate_colors(profiles),
            "brightness": TemplateAggregator._average_metric(profiles, ["brightness"]),
            "edgeDensity": TemplateAggregator._average_metric(profiles, ["edgeDensity"]),
            "textDensity": TemplateAggregator._average_metric(profiles, ["textDensity"]),
            "cornerDensity": TemplateAggregator._average_metric(profiles, ["cornerDensity"]),
            "components": TemplateAggregator._aggregate_components(profiles),
            "relationships": TemplateAggregator._aggregate_relationships(profiles),
            "ocrText": "\n".join([p.get("ocrText", "") for p in profiles if p.get("ocrText")])[:20000],
            "textBlocks": [block for p in profiles for block in (p.get("textBlocks") or [])][:500],
            "ocrBoundingBoxes": [box for p in profiles for box in (p.get("ocrBoundingBoxes") or [])][:500],
            "qrData": TemplateAggregator._most_common([p.get("qrData") for p in profiles if p.get("qrData")]),
            "logos": TemplateAggregator._components_by_type(profiles, {"LOGO", "HEADER_LOGO"}),
            "signatures": TemplateAggregator._components_by_type(profiles, {"SIGNATURE"}),
            "hashes": {
                "perceptual": [p.get("perceptualHash") for p in profiles if p.get("perceptualHash")],
                "binary": [p.get("imageHash") for p in profiles],
            },
            "metadata": {
                "trainedSamples": len(profiles),
                "trainingQuality": TemplateAggregator._assess_training_quality(profiles),
                "samplingDateTime": [],
                "extractionConfidence": TemplateAggregator._calculate_confidence(profiles),
            },
        }

        return aggregated

    @staticmethod
    def _most_common(values: list[Any]) -> Any:
        if not values:
            return ""
        counts: dict[str, int] = {}
        originals: dict[str, Any] = {}
        for value in values:
            key = str(value)
            counts[key] = counts.get(key, 0) + 1
            originals[key] = value
        return originals[max(counts, key=counts.get)]

    @staticmethod
    def _components_by_type(profiles: list[dict[str, Any]], types: set[str]) -> list[dict[str, Any]]:
        return [
            component
            for profile in profiles
            for component in (profile.get("components") or [])
            if component.get("type") in types
        ][:100]

    @staticmethod
    def _aggregate_resolution(profiles: list[dict[str, Any]]) -> dict[str, float]:
        """Aggregate resolution across samples."""
        widths = []
        heights = []
        aspect_ratios = []

        for profile in profiles:
            res = profile.get("resolution", {})
            if res.get("width"):
                widths.append(res["width"])
            if res.get("height"):
                heights.append(res["height"])
            if res.get("aspectRatio"):
                aspect_ratios.append(res["aspectRatio"])

        return {
            "width": round(sum(widths) / len(widths)) if widths else 0,
            "height": round(sum(heights) / len(heights)) if heights else 0,
            "aspectRatio": round(sum(aspect_ratios) / len(aspect_ratios), 4) if aspect_ratios else 0,
            "variance": {
                "width": round(max(widths or [0]) - min(widths or [0])) if widths else 0,
                "height": round(max(heights or [0]) - min(heights or [0])) if heights else 0,
            },
        }

    @staticmethod
    def _aggregate_colors(profiles: list[dict[str, Any]]) -> list[str]:
        """Aggregate dominant colors across samples."""
        color_frequency: dict[str, int] = {}

        for profile in profiles:
            for color in profile.get("dominantColors", [])[:3]:
                color_frequency[color] = color_frequency.get(color, 0) + 1

        sorted_colors = sorted(color_frequency.items(), key=lambda x: x[1], reverse=True)
        return [color for color, _ in sorted_colors[:5]]

    @staticmethod
    def _average_metric(profiles: list[dict[str, Any]], path: list[str]) -> float:
        """Average a metric across profiles."""
        values = []
        for profile in profiles:
            cursor: Any = profile
            for key in path:
                cursor = cursor.get(key, {}) if isinstance(cursor, dict) else {}
            if isinstance(cursor, (int, float)):
                values.append(cursor)

        if not values:
            return 0.0

        avg = sum(values) / len(values)
        variance = sum((v - avg) ** 2 for v in values) / len(values) if len(values) > 1 else 0
        return round(avg, 4)

    @staticmethod
    def _aggregate_components(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Aggregate detected components across samples."""
        component_map: dict[str, list[dict[str, Any]]] = {}

        for profile in profiles:
            for component in profile.get("components", []):
                comp_type = component.get("type")
                if comp_type not in component_map:
                    component_map[comp_type] = []
                component_map[comp_type].append(component)

        aggregated_components = []
        for comp_type, instances in component_map.items():
            if not instances:
                continue

            # Calculate average position and size
            avg_x = round(sum(c["coordinates"]["x"] for c in instances) / len(instances))
            avg_y = round(sum(c["coordinates"]["y"] for c in instances) / len(instances))
            avg_w = round(sum(c["coordinates"]["width"] for c in instances) / len(instances))
            avg_h = round(sum(c["coordinates"]["height"] for c in instances) / len(instances))

            # Calculate stability (how consistent across samples)
            x_variance = max(c["coordinates"]["x"] for c in instances) - min(c["coordinates"]["x"] for c in instances)
            y_variance = max(c["coordinates"]["y"] for c in instances) - min(c["coordinates"]["y"] for c in instances)

            stability = "high" if (x_variance < 20 and y_variance < 20) else "medium" if (x_variance < 50 and y_variance < 50) else "low"

            aggregated_components.append({
                "type": comp_type,
                "frequency": len(instances),
                "stability": stability,
                "coordinates": {
                    "x": avg_x,
                    "y": avg_y,
                    "width": avg_w,
                    "height": avg_h,
                    "centerX": avg_x + avg_w // 2,
                    "centerY": avg_y + avg_h // 2,
                    "variance": {"x": x_variance, "y": y_variance},
                },
                "aspectRatio": round(avg_w / avg_h, 4) if avg_h != 0 else 0,
                "required": comp_type in ["TITLE", "NAME_BLOCK", "ISSUE_DATE"],
            })

        return aggregated_components

    @staticmethod
    def _aggregate_relationships(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Aggregate spatial relationships across samples."""
        relationship_map: dict[str, list[int]] = {}

        for profile in profiles:
            for rel in profile.get("relationships", []):
                key = f"{rel['source']}→{rel['target']}→{rel['relation']}"
                if key not in relationship_map:
                    relationship_map[key] = []
                relationship_map[key].append(rel.get("distancePixels", 0))

        aggregated_relationships = []
        for key, distances in relationship_map.items():
            parts = key.split("→")
            source, target, relation = parts[0], parts[1], parts[2]

            avg_distance = round(sum(distances) / len(distances))
            max_distance = max(distances)
            min_distance = min(distances)

            aggregated_relationships.append({
                "source": source,
                "target": target,
                "relation": relation,
                "averageDistancePixels": avg_distance,
                "consistency": "high" if (max_distance - min_distance) < 30 else "medium" if (max_distance - min_distance) < 100 else "low",
                "variance": {"min": min_distance, "max": max_distance},
            })

        return aggregated_relationships

    @staticmethod
    def _assess_training_quality(profiles: list[dict[str, Any]]) -> str:
        """Assess the quality of training samples."""
        if len(profiles) < 2:
            return "insufficient-samples"
        if len(profiles) < 3:
            return "minimal"
        if len(profiles) < 5:
            return "fair"
        if len(profiles) < 10:
            return "good"
        return "excellent"

    @staticmethod
    def _calculate_confidence(profiles: list[dict[str, Any]]) -> float:
        """Calculate overall extraction confidence."""
        confidences = []

        for profile in profiles:
            score = 0.5

            # OCR confidence
            if profile.get("ocrText"):
                score += 0.2

            # QR confidence
            if profile.get("qrData"):
                score += 0.15

            # Component detection
            if len(profile.get("components", [])) > 2:
                score += 0.1

            # Hash availability
            if profile.get("perceptualHash") and profile.get("imageHash"):
                score += 0.05

            confidences.append(score)

        if not confidences:
            return 0.0

        return round(sum(confidences) / len(confidences) * 100, 2)
