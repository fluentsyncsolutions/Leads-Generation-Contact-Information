const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput() || {};

    const searchTerms = [
        "hotel", "resort", "villa", "casa", "hotspring", "private resort",
        "beach resort", "spa", "inn", "lodge", "vacation rental",
        "guesthouse", "bed and breakfast", "boutique hotel", 
        "mountain resort", "eco resort"
    ];

    const location = input.location || "Philippines";
    const maxResults = input.maxResults || 200;
    const language = input.language || 'en';
    const enrichContacts = input.enrichContacts ?? true;

    const googleMapsScraperRun = await Apify.call('poidata/google-maps-scraper', {
        searchTerms,
        location,
        language,
        maxResultsPerSearchTerm: maxResults,
        includeContactDetails: false,
    });

    const datasetId = googleMapsScraperRun.defaultDatasetId;
    log.info(`Maps scraped; dataset ID: ${datasetId}`);

    let finalDatasetId = datasetId;
    if (enrichContacts) {
        const enrichRun = await Apify.call('lukaskrivka/google-maps-with-contact-details', {
            datasetId,
        });
        finalDatasetId = enrichRun.defaultDatasetId;
        log.info(`Dataset enriched; new dataset ID: ${finalDatasetId}`);
    }

    const { items } = await Apify.client.datasets.getItems({
        datasetId: finalDatasetId,
        clean: true,
        format: 'json',
    });

    const cleanedData = items.map(biz => ({
        businessName: biz.title || biz.name || "",
        category: biz.category || "",
        address: biz.address || "",
        city: biz.city || "",
        region: biz.region || "",
        country: biz.country || "",
        latitude: biz.location?.lat || null,
        longitude: biz.location?.lng || null,
        rating: biz.rating || null,
        reviewsCount: biz.reviewsCount || null,
        phone: biz.phone || "",
        email: biz.email || "",
        website: biz.website || "",
        placeId: biz.placeId || "",
        googleMapsUrl: biz.url || "",
        openingHours: biz.openingHours || []
    }));

    await Apify.setValue('OUTPUT', cleanedData);
    log.info(`Scraping completed. Total records: ${cleanedData.length}`);
});
