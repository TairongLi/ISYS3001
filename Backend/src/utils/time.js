export function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

// 是否重叠：!(newEnd <= s || newStart >= e)
export function overlaps(newStart, newEnd, s, e) {
    return !(newEnd <= s || newStart >= e);
}
