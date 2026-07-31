/* One line of real history per club-season, shown when the draw lands on it
   and in the album. Sourced from the league's own record: champions, deciders,
   deductions, records and the odd disgrace. Keyed "Club|Season". */
export const LORE = {
  // ---- the founding years: a summer league, semi-professional, eight clubs ----
  "Arsenal|2011": "The first WSL champions — and a domestic treble in the league's opening year, because the old order simply carried on.",
  "Birmingham City|2011": "Runners-up in the inaugural season, with Rachel Williams scoring 14 in 14 to win the very first Golden Boot.",
  "Everton|2011": "Third in the first WSL season, back when 2,510 through the gate was a record crowd.",
  "Lincoln Ladies|2011": "A surprise choice over bigger names when the FA handed out the first eight licences — and they took their place anyway.",

  "Arsenal|2012": "Unbeaten. Ten wins, four draws, no defeats — the first side to go a whole WSL season without losing, and a ninth straight English title.",
  "Birmingham City|2012": "Runners-up again, in the season 5,052 turned up for Arsenal at home — the biggest crowd the young league had seen.",
  "Everton|2012": "Third once more, in a summer that stopped halfway through for a London Olympics.",

  "Liverpool|2013": "Bottom of the league with five points in 2012. Champions a year later, sealed 2-0 in a winner-takes-all final day.",
  "Bristol Academy|2013": "Runners-up, and ninety minutes from the title — they arrived at the last day needing to win it and lost it.",
  "Arsenal|2013": "Third, after a three-point deduction for fielding an unregistered player knocked them out of second.",
  "Doncaster Rovers Belles|2013": "A founder club demoted on non-sporting grounds before the season had even finished. The appeal failed; the licence went to a brand-new Manchester City.",
  "Chelsea|2013": "Emma Hayes' first full season in charge. They won nothing — and everything that came later was built here.",

  // ---- two tiers, and the first promotion and relegation in the league's life ----
  "Liverpool|2014": "Champions on goal difference having begun the final day third — 3-0 at Bristol while Chelsea lost and Birmingham drew.",
  "Chelsea|2014": "Second by two goals. The title was in their hands on the final day and it slipped straight through them.",
  "Birmingham City|2014": "Third, with Karen Carney's eight goals still the lowest tally ever to win a WSL Golden Boot.",
  "Manchester City|2014": "Into the top flight as a brand-new team, on a licence taken from someone else — and they would go on to define the modern league.",

  "Chelsea|2015": "A first league title, won 4-0 at home on the final day, and the first domestic double of the Emma Hayes era.",
  "Manchester City|2015": "Runners-up in only their second season of existence, laying the foundations for the year that followed.",
  "Arsenal|2015": "Third — the first season in which the league's founding champions looked like one of the chasing pack.",
  "Sunderland|2015": "Newly promoted and fourth, with a twenty-year-old Beth Mead scoring twelve of them to win the Golden Boot.",
  "Notts County|2015": "The old Lincoln licence, relocated and rebranded — and two years from folding two days before a season started.",

  "Manchester City|2016": "Unbeaten champions who conceded four goals in sixteen games, and clinched it by beating the holders.",
  "Chelsea|2016": "Second, undone by the meanest defence the WSL has ever had to play against.",
  "Arsenal|2016": "Third, in the last full summer season the league would ever play.",
  "Birmingham City|2016": "Still there, still competitive, in the final year of the old calendar.",

  // ---- the bridge, then winter football ----
  "Chelsea|2017 Spring Series": "Eight games to drag the league from summer to winter. Level on points with City, ahead on goal difference — and it has never counted as a title.",
  "Manchester City|2017 Spring Series": "Nineteen points, the same as Chelsea, and second on goal difference in a half-season that goes in no record book.",

  "Chelsea|2017-18": "The first proper winter season, and Chelsea walked through it unbeaten, winning the thing by six points.",
  "Manchester City|2017-18": "Second again, in the last season before the league turned fully professional.",
  "Arsenal|2017-18": "Third, and rebuilding — the title would come back the following year.",
  "Birmingham City|2017-18": "Ellen White scored fifteen and won the Golden Boot from a side nowhere near the title race.",

  "Arsenal|2018-19": "Eighteen wins, seventy goals, a first title in six years — and Vivianne Miedema's 22, still the WSL single-season record.",
  "Manchester City|2018-19": "Runners-up in the restructure season, the year the top flight became fully professional.",
  "Chelsea|2018-19": "Third, in the only season between 2015 and 2025 that Chelsea finished outside the top two.",
  "Birmingham City|2018-19": "Survivors of the licensing reset that cost Sunderland their place and sent Yeovil down on minus three.",

  "Chelsea|2019-20": "Champions of a season that stopped in March. City had more points; Chelsea had the better points-per-game, and the trophy.",
  "Manchester City|2019-20": "Forty points to Chelsea's thirty-nine — and second, decided on a decimal after COVID ended the season early.",
  "Arsenal|2019-20": "The season of Arsenal 11-1 Bristol City, still the record WSL scoreline, six of them Miedema's.",
  "Manchester United|2019-20": "A first season in the top flight, fourth place, and the beginning of a proper club.",

  "Chelsea|2020-21": "A fourth title, sealed 5-0 on the final day, with Sam Kerr's 21 goals leading the line.",
  "Manchester City|2020-21": "Two points short. Again.",
  "Arsenal|2020-21": "Third in a season played almost entirely behind closed doors.",
  "Manchester United|2020-21": "Fourth, and closing — the gap to the top three shrinking every year.",
  "Everton|2020-21": "The strongest Everton side of the modern era, in the last season before the top four pulled away for good.",

  "Chelsea|2021-22": "Won by a single point on the last day: 2-1 down at Manchester United, 4-2 up by the end, Kerr scoring twice.",
  "Arsenal|2021-22": "Lost one league game all season. Still finished second.",
  "Manchester City|2021-22": "Third, in a season that started badly and never quite recovered.",
  "Manchester United|2021-22": "20,241 at Old Trafford for their first game in front of supporters — and a defeat that handed Chelsea the title.",
  "Tottenham Hotspur|2021-22": "Establishing themselves in the top half, in a division that was no longer only about three clubs.",

  "Chelsea|2022-23": "A fourth straight title, sealed 3-0 on the final day, two points clear of a challenger nobody had expected.",
  "Manchester United|2022-23": "Two points from the title in their fourth season in the division. Nobody was laughing at them any more.",
  "Arsenal|2022-23": "The season 47,367 came to the Emirates for a north London derby and changed what the league thought was possible.",
  "Manchester City|2022-23": "Fourth, in the first season the top of the table was genuinely four clubs deep.",
  "Aston Villa|2022-23": "Fifth — and Rachel Daly scored 22 from there, equalling the WSL single-season record.",

  "Chelsea|2023-24": "Identical records, identical points. Chelsea took it from City by seven goals, in Emma Hayes' final match after twelve years.",
  "Manchester City|2023-24": "Eighteen wins, one draw, three defeats, fifty-five points — and second, because of goal difference. Nothing else separated them.",
  "Arsenal|2023-24": "60,160 at the Emirates for Manchester United: the first sell-out in WSL history, and still the record crowd.",
  "Manchester United|2023-24": "Fourth, a year after nearly winning it, in a division that had stopped being predictable.",
  "Liverpool|2023-24": "Back in the top flight and staying there, after two seasons away following relegation by points-per-game.",
  "Tottenham Hotspur|2023-24": "A mid-table season that ended with an FA Cup final at Wembley.",

  "Chelsea|2024-25": "The first team ever to go a full 22-game WSL season unbeaten, on a record sixty points — and a treble in Sonia Bompastor's first year.",
  "Arsenal|2024-25": "Second to an unbeaten side, with Alessia Russo sharing a Golden Boot on twelve — the joint-lowest of the professional era.",
  "Manchester United|2024-25": "Third, in the first season run by the clubs themselves rather than the FA.",
  "Manchester City|2024-25": "Fourth, and rebuilding for a title tilt that arrived the very next year.",
  "Everton|2024-25": "Mid-table, in the WSL's first season under Women's Professional Leagues Ltd.",
  "Brighton & Hove Albion|2024-25": "Seven seasons in the top flight and still there, quietly.",
  "West Ham United|2024-25": "The side that sent Crystal Palace down with a 7-1 win at Selhurst Park.",
  "Liverpool|2024-25": "Solid, established, a long way from the club that won it in 2013 and 2014.",
  "Aston Villa|2024-25": "Life after Rachel Daly, and finding out how much of the previous three years had been her.",
  "Leicester City|2024-25": "Four seasons up and surviving each one.",
  "Tottenham Hotspur|2024-25": "Another year in the middle of a division stretching away at the top.",
  "Crystal Palace|2024-25": "One season in the WSL, ended by a 1-7 defeat at home to West Ham.",

  "Manchester City|2025-26": "A first title in a decade, clinched with a game to spare — and the end of six straight Chelsea championships.",
  "Arsenal|2025-26": "Runners-up, undone by a 1-1 draw at Brighton that handed City the trophy.",
  "Chelsea|2025-26": "Third: the first season since 2018-19 that ended with the trophy somewhere else.",
  "Manchester United|2025-26": "Still in the conversation at the top, six seasons after arriving in the division.",
  "London City Lionesses|2025-26": "The first club with no men's team ever to play in the WSL — sixth on debut, with the world transfer record in midfield.",
  "Everton|2025-26": "Thirteen seasons of top-flight football across two spells, and counting.",
  "Brighton & Hove Albion|2025-26": "Held Arsenal 1-1 in May and decided the title — for somebody else.",
  "Liverpool|2025-26": "Two-time champions, now a club that measures success in staying up comfortably.",
  "Aston Villa|2025-26": "Six straight seasons in the WSL since coming up when COVID ended a season early.",
  "Tottenham Hotspur|2025-26": "Seven seasons in the top flight since promotion, still looking for a first trophy.",
  "West Ham United|2025-26": "Eight seasons up, from a licence granted straight out of the third tier.",
  "Leicester City|2025-26": "Relegated on penalties in a play-off, after five years in the division.",

  // ---- the rest of the league ----
  "Reading|2017-18": "Kelly Chambers' Reading in the first winter season, with Fara Williams pulling the strings in midfield.",
  "Reading|2018-19": "Mid-table and hard to beat — the quiet middle of an eight-season top-flight stay nobody predicted.",
  "Yeovil Town|2017-18": "Part-timers against professionals: two goals scored all season, and they turned up every single week anyway.",
  "Bristol City|2019-20": "A teenage Ebony Salmon up front — and an 11-1 at the Emirates that went into the record books against their name.",
  "Bristol City|2023-24": "One win all season and straight back down; by now the gap to the professionals was a chasm.",
  "West Ham United|2018-19": "Into the top flight straight from the third tier by licence — and to an FA Cup final at Wembley in year one.",
  "Everton|2017-18": "Back in the big league after the reset, with a teenage Chloe Kelly learning her trade out wide.",
  "Sunderland|2016": "The last summer season and Beth Mead's last year in red and white — the licensing axe already being sharpened.",
  "Birmingham City|2021-22": "Bottom from the start, relegated by May — eleven seasons of punching above their weight, ended.",
  "Liverpool|2018-19": "Two-time champions drifting in mid-table, one season from the points-per-game relegation nobody forgave."
};
