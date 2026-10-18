/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock seed data for flood reports.
 * This data is used to populate localStorage on first load.
 * When the backend is connected, this file will be removed.
 */

import { FloodReport } from '../types';

export const MOCK_REPORTS: FloodReport[] = [
  {
    id: "FW-2026-3849",
    location: "412 River Road (Underpass Sector B)",
    severity: "high",
    description: "Critical riverbank overflow. Water depth exceeds 1.2 meters. Standard passenger vehicles cannot pass. Emergency services have placed temporary barriers, but water is still rising.",
    date: "2026-08-24 06:15",
    status: "verified",
    reporterName: "Arthur Vance",
    phone: "555-0192",
    photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
    waterLevelDepth: "1.2m",
    latitude: 34.0622,
    longitude: -118.2237
  },
  {
    id: "FW-2026-4012",
    location: "805 North Boulevard (Commercial Strip)",
    severity: "medium",
    description: "Severe drainage main backup. Sidewalks are fully submerged (approx 20cm). Water is approaching storefront entryways. Municipal storm drains appear entirely blocked with leaf litter.",
    date: "2026-08-24 05:30",
    status: "pending",
    reporterName: "Sarah Jenkins",
    phone: "555-0143",
    photoUrl: "https://images.unsplash.com/photo-1485199692108-c3b5069de6a0?auto=format&fit=crop&w=600&q=80",
    waterLevelDepth: "20cm",
    latitude: 34.0412,
    longitude: -118.2637
  },
  {
    id: "FW-2026-4299",
    location: "Intersection of Elm Street & 4th Avenue",
    severity: "low",
    description: "Heavy gutter pooling in the rightmost lane. Vehicle speed is reduced due to hydroplaning risk. Water depth is roughly 5cm but stable.",
    date: "2026-08-24 04:45",
    status: "resolved",
    reporterName: "Marcus Brody",
    phone: "555-0177",
    photoUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=600&q=80",
    waterLevelDepth: "5cm",
    adminNotes: "City drainage crew cleared debris from catch basin. Water receded completely.",
    latitude: 34.0298,
    longitude: -118.2745
  },
  {
    id: "FW-2026-4311",
    location: "East Creek Park & Walking Trail",
    severity: "medium",
    description: "Creek overflow has saturated the low-lying picnic areas and main concrete pathway. Water is flowing slowly but depth is around 30cm. Park rangers have closed the footbridges.",
    date: "2026-08-24 06:45",
    status: "verified",
    reporterName: "Ranger Dave Lin",
    phone: "555-0211",
    photoUrl: "https://images.unsplash.com/photo-1461511654394-b1935547dfc4?auto=format&fit=crop&w=600&q=80",
    waterLevelDepth: "30cm",
    latitude: 34.0754,
    longitude: -118.2105
  },
  {
    id: "FW-2026-4550",
    location: "921 Whispering Pines Subdivision",
    severity: "low",
    description: "Street gutters overflowing. Water starting to puddle across front lawns. No structure intrusion yet but water is rising at approximately 2cm per hour.",
    date: "2026-08-24 07:05",
    status: "pending",
    reporterName: "Clara Oswald",
    phone: "555-0185",
    waterLevelDepth: "8cm",
    latitude: 34.0815,
    longitude: -118.2520
  },
  {
    id: "FW-2026-4700",
    location: "700 Alameda Boulevard (Major Interchange)",
    severity: "critical",
    description: "IMMINENT THREAT: Rapidly rising surge water. The highway interchange is submerged under nearly 2 meters of water. Emergency rescue craft are deployed.",
    date: "2026-08-24 07:30",
    status: "verified",
    reporterName: "Commander Sarah West",
    phone: "555-9111",
    waterLevelDepth: "1.8m",
    latitude: 34.0522,
    longitude: -118.2437
  }
];
