import {decodeLeaderboard} from './event-api.js';
// Swagger: https://swagger.dsu-academy.com/gsd.swagger.json
// Set enabled=true after the seven game IDs are agreed with the app/backend owner.
export const integrationConfig = {
 enabled: false,
 apiBaseUrl: 'https://admin.dsu-academy.com/api/v1',
 gameIds: Array.from({length:7},(_,i)=>`rythm_day_${i+1}`), // Proposed IDs, not yet agreed.
 scoreField: 'score',
 bodyEncoding: 'json',
 authHeader: 'Authorization',
 authPrefix: '',
 dateOffsetMinutes: 0, // Provisional UTC for dates without a timezone.
 endDateInclusive: false, // Provisional: endDate is an exclusive boundary.
 decodeLeaderboard,
};
