const normalizeRange = (range) => ({
    start: Number(range.start),
    end: Number(range.end)
});

const isValidRange = (range) => {
    const { start, end } = normalizeRange(range);
    return Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= 1 && start <= end;
};

const rangesOverlap = (a, b) => {
    const ra = normalizeRange(a);
    const rb = normalizeRange(b);
    return ra.start <= rb.end && rb.start <= ra.end;
};

const getFlatNumbers = (ranges) => {
    const flats = [];
    (ranges || []).forEach((range) => {
        const { start, end } = normalizeRange(range);
        if (!Number.isInteger(start) || !Number.isInteger(end)) return;
        for (let i = start; i <= end; i++) {
            flats.push(i);
        }
    });
    return flats.sort((a, b) => a - b);
};

const getFlatCount = (ranges) => {
    return (ranges || []).reduce((sum, range) => {
        const { start, end } = normalizeRange(range);
        return sum + (Number.isInteger(start) && Number.isInteger(end) && start <= end ? end - start + 1 : 0);
    }, 0);
};

const isFlatInRanges = (ranges, flatNumber) => {
    return (ranges || []).some((range) => {
        const { start, end } = normalizeRange(range);
        return flatNumber >= start && flatNumber <= end;
    });
};

const describeRanges = (ranges) => {
    return (ranges || []).map((range) => `${range.start}-${range.end}`).join(", ");
};

const findOverlappingRanges = (ranges) => {
    const list = (ranges || []).map(normalizeRange);
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            if (rangesOverlap(list[i], list[j])) {
                return `${list[i].start}-${list[i].end} and ${list[j].start}-${list[j].end}`;
            }
        }
    }
    return null;
};

/**
 * Resolves the effective flat ranges of a configuration document.
 * Legacy documents stored a single `expectedFlats` count with no ranges,
 * which is interpreted as the range 1..expectedFlats.
 */
const normalizeConfigRanges = (config) => {
    if (config && Array.isArray(config.flatRanges) && config.flatRanges.length > 0) {
        return config.flatRanges.map(normalizeRange);
    }
    if (config && config.expectedFlats && Number(config.expectedFlats) > 0) {
        return [{ start: 1, end: Number(config.expectedFlats) }];
    }
    return [];
};

export {
    isValidRange,
    rangesOverlap,
    getFlatNumbers,
    getFlatCount,
    isFlatInRanges,
    describeRanges,
    findOverlappingRanges,
    normalizeConfigRanges
};