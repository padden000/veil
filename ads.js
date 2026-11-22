/* Ad slots (Google AdSense).
   While client is empty, no ad frames are shown at all.
   To see where the frames are without ads, open the site with ?adpreview  (e.g. https://veil-jpmeta.pages.dev/?adpreview#home)
   To show ads: put your AdSense publisher id in client (ca-pub-...) and each ad unit's slot id below.
   Leave a slot empty to keep that frame hidden. */
window.VEIL_ADS = {
  client: "",
  slots: {
    "home-interlude": "",   /* A: HOME, between 02 HEROES and 03 MATCHUP LAB */
    "champion-data": ""     /* C: hero page, end of the tab content (above the byline), on every tab */
  }
};
