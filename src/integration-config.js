import {decodeLeaderboard} from './event-api.js?v=32d9dbaa4b3a';
// Swagger: https://swagger.dsu-academy.com/gsd.swagger.json
// Day IDs approved by the app/backend owner on 2026-10-07.
export const integrationConfig = {
 enabled: true,
 apiBaseUrl: 'https://admin.dsu-academy.com/api/v1',
 gameIds: Array.from({length:7},(_,i)=>`rythm_day_${i+1}`), // Approved leaderboard IDs.
 scoreField: 'score',
 bodyEncoding: 'json',
 authHeader: 'Authorization',
 authPrefix: '',
 dateOffsetMinutes: 0, // Provisional UTC for dates without a timezone.
 endDateInclusive: false, // Provisional: endDate is an exclusive boundary.
 decodeLeaderboard,
};
