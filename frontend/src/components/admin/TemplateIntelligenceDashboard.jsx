import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { api } from '../lib/api.js';

/**
 * Admin Template Dashboard
 * Displays learned template profiles and extraction intelligence
 */
export default function TemplateIntelligenceDashboard() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aiStatus, setAiStatus] = useState({ status: 'connecting', message: 'Connecting to AI service...' });

    // Fetch templates on mount
    useEffect(() => {
        loadTemplates();
        checkAiHealth();
    }, []);

    const checkAiHealth = async () => {
        try {
            const response = await fetch('http://localhost:8000/health');
            if (response.ok) {
                setAiStatus({ status: 'ready', message: 'AI service operational' });
            }
        } catch (_e) {
            setAiStatus({ status: 'error', message: 'AI service unavailable' });
        }
    };

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mentor/templates');
            setTemplates(response.data.items || []);
            setError(null);
        } catch (_e) {
            setError('Failed to load templates');
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplateDetails = async (template) => {
        try {
            setSelectedTemplate({ ...template, loading: true });
            // In a real app, fetch detailed intelligence from AI service
            // const details = await fetch(`http://localhost:8000/templates/${template._id}`);
            setSelectedTemplate({ ...template, loading: false });
        } catch (_e) {
            setError('Failed to load template details');
        }
    };

    const brightnessValue = (value) => {
        if (typeof value === 'number') return value;
        if (value && typeof value === 'object') return value.avg ?? value.mean ?? value.value ?? null;
        return null;
    };

    const edgeDensityValue = (profile) => {
        const value = profile?.edgeDensity;
        if (typeof value === 'number') return value;
        if (value && typeof value === 'object') return value.avg ?? value.mean ?? value.value ?? null;
        return profile?.layouts?.length ? profile.layouts.length : null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
                    <p className="text-slate-400">Loading template intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                    Template Intelligence Center
                </h1>
                <p className="text-slate-400">Manage learned certificate templates and extraction profiles</p>
            </div>

            {/* AI Service Status */}
            <div className="mb-6 p-4 rounded-lg bg-slate-800/50 backdrop-blur border border-slate-700 flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${aiStatus.status === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-300">{aiStatus.message}</span>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-900/20 backdrop-blur border border-red-800 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="text-red-300">{error}</span>
                </div>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template List */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-cyan-400" />
                            {templates.length} Templates
                        </h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {templates.map((template) => (
                                <button
                                    key={template._id}
                                    onClick={() => loadTemplateDetails(template)}
                                    className={`w-full p-3 rounded-lg text-left transition-all ${selectedTemplate?._id === template._id
                                        ? 'bg-cyan-500/20 border border-cyan-400'
                                        : 'bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50'
                                        }`}
                                >
                                    <p className="font-semibold text-white truncate">
                                        {template.certification?.name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-slate-400">v{template.version}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Template Details */}
                {selectedTemplate && (
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                                {selectedTemplate.certification?.name}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Organization</p>
                                    <p className="text-white font-semibold">{selectedTemplate.organization?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Training Quality</p>
                                    <p className="text-white font-semibold">
                                        {selectedTemplate.extractedProfile?.metadata?.trainingQuality || 'fair'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Trained Samples</p>
                                    <p className="text-white font-semibold">
                                        {selectedTemplate.extractedProfile?.metadata?.trainedSamples || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                                    <p className="text-white font-semibold">{selectedTemplate.status}</p>
                                </div>
                            </div>
                        </div>

                        {/* Visual Profile */}
                        {selectedTemplate.extractedProfile && (
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
                                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-400" />
                                    Visual Intelligence
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">Resolution</p>
                                        <p className="text-white">
                                            {selectedTemplate.extractedProfile?.resolution?.width}×
                                            {selectedTemplate.extractedProfile?.resolution?.height}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">Brightness</p>
                                        <p className="text-white">
                                            {brightnessValue(selectedTemplate.extractedProfile?.brightness) ?? 'n/a'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">Edge Density</p>
                                        <p className="text-white">
                                            {edgeDensityValue(selectedTemplate.extractedProfile)?.toFixed?.(3) ?? edgeDensityValue(selectedTemplate.extractedProfile) ?? 'n/a'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">Text Density</p>
                                        <p className="text-white">
                                            {selectedTemplate.extractedProfile?.textDensity?.toFixed?.(3) ?? selectedTemplate.extractedProfile?.textDensity ?? 'n/a'}
                                        </p>
                                    </div>
                                </div>

                                {/* Dominant Colors */}
                                <div className="mt-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Dominant Colors</p>
                                    <div className="flex gap-2">
                                        {selectedTemplate.extractedProfile?.dominantColors?.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="h-8 w-8 rounded border border-slate-600"
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Components */}
                        {selectedTemplate.extractedProfile?.layouts && (
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
                                <h4 className="font-semibold text-white mb-4">
                                    Detected Layout Regions ({selectedTemplate.extractedProfile.layouts.length})
                                </h4>
                                <div className="space-y-2">
                                    {selectedTemplate.extractedProfile.layouts.map((comp, idx) => (
                                        <div key={idx} className="p-3 bg-slate-700/30 rounded border border-slate-600">
                                            <p className="text-sm font-semibold text-white">{comp.type || 'region'}</p>
                                            <p className="text-xs text-slate-400">
                                                Density: <span className="text-cyan-300">{comp.density ?? 'n/a'}</span> • Size:{' '}
                                                <span className="text-cyan-300">{comp.width || 0}×{comp.height || 0}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Thresholds */}
                        {selectedTemplate.thresholds && (
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
                                <h4 className="font-semibold text-white mb-4">Fraud Detection Thresholds</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Name Similarity</p>
                                        <p className="text-white font-semibold">{selectedTemplate.thresholds.nameSimilarity}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Visual Similarity</p>
                                        <p className="text-white font-semibold">{selectedTemplate.thresholds.visualSimilarity}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Fraud Review</p>
                                        <p className="text-white font-semibold">{selectedTemplate.thresholds.fraudReview}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Fraud Reject</p>
                                        <p className="text-white font-semibold">{selectedTemplate.thresholds.fraudReject}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
