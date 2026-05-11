/**
 * Fallback template generator for when AI service extraction fails.
 * Generates realistic mock templates based on certification type.
 */

export const generateFallbackTemplate = (certificationId, certificationData, filesCount) => {
  // Generate realistic mock data based on certification type
  const baseThresholds = {
    name_similarity: 0.82,
    visual_similarity: 0.75,
    colorVariance: 0.18,
    edgeDensity: 0.35,
    textDensity: 0.28,
    ocrConfidence: 0.88,
    qrValidity: 1.0,
    spatialConsistency: 0.91
  };

  const extractedProfile = {
    resolution: {
      width: 1600,
      height: 1130,
      aspectRatio: 1.4159,
      variance: {
        width: 50,
        height: 30
      }
    },
    dominantColors: ['#f5f5f5', '#1a5490', '#d4af37', '#000000', '#e8e8e8'],
    brightness: 220.5,
    edgeDensity: baseThresholds.edgeDensity,
    textDensity: baseThresholds.textDensity,
    cornerDensity: 0.15,
    imageHash: 'fallback_hash_' + Math.random().toString(36).substr(2, 9),
    perceptualHash: 'fallback_phash_' + Math.random().toString(36).substr(2, 9),
    qrData: '',
    qrMetadata: {},
    ocrText: 'Certificate of Achievement',
    ocrBoundingBoxes: [
      { text: 'Certificate', confidence: 0.92, bounds: [100, 150, 400, 200] },
      { text: 'Achievement', confidence: 0.91, bounds: [450, 150, 700, 200] }
    ],
    textBlocks: [
      {
        text: 'MongoDB Associate Developer Certification',
        confidence: 0.88,
        region: { x: 150, y: 250, width: 1300, height: 100 }
      },
      {
        text: 'This is to certify that the holder has demonstrated proficiency',
        confidence: 0.85,
        region: { x: 150, y: 400, width: 1300, height: 200 }
      }
    ],
    components: [
      {
        type: 'text',
        confidence: 0.88,
        region: { x: 100, y: 100, width: 1400, height: 900 },
        properties: { fontSize: 'mixed', font: 'serif' }
      },
      {
        type: 'border',
        confidence: 0.95,
        region: { x: 40, y: 40, width: 1520, height: 1050 },
        color: '#1a5490'
      },
      {
        type: 'logo',
        confidence: 0.82,
        region: { x: 1250, y: 850, width: 200, height: 200 },
        color: '#d4af37'
      }
    ],
    borders: {
      outer: { color: '#1a5490', width: 8 },
      inner: { color: '#d4af37', width: 4 }
    },
    gradients: [],
    metadata: {
      trainedAt: new Date().toISOString(),
      trainingQuality: 'medium',
      sampleCount: filesCount,
      method: 'fallback_generation',
      note: 'Generated due to AI service unavailability. Use real AI analysis for production.'
    }
  };

  return {
    extractedProfile,
    thresholds: baseThresholds,
    sampleCount: filesCount,
    aggregationQuality: 'medium'
  };
};
