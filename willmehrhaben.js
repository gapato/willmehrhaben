let showOld = true;

let NEXT_DATA = null;

const hide_old_text = "Alte Anzeigen ausblenden";
const show_old_text = "Alte Anzeigen einblenden";

function tryRemove(id) {
    const elem = document.getElementById(id);
    if (elem !== null) {
        console.debug("[willmehrhaben] removing element " + id);
        elem.remove();
    }
}

function checkRealEstate() {
    // checking the URL is not enough (search agents)

    return getPageProps().then((pageProps) => {
        const details = pageProps["advertDetails"] || pageProps["searchResult"];

        if (typeof details === "undefined") return false;

        return details["breadcrumbs"][1]["displayName"] === "Immobilien";
    });
}

function isAdPage() {
    const url = window.location.toString();
    const single = url.includes("/d/");
    const list = (document.getElementById("skip-to-resultlist") !== null);
    const dataInstalled = typeof document.documentElement["attributes"]["data-lt-installed"] !== 'undefined';
    return { "single": single, "list": list, "url": url, "installed": dataInstalled, "result": single || list };
}

function getIdFromUrl() {
    const url = window.location.toString();
    const v = url.split("-");
    const idFromUrl = v[v.length-1].split("/")[0];
    return idFromUrl;
}

function getEmptyPlaceholder() {
    const editDateTag = document.querySelector('[data-testid="ad-detail-ad-edit-date-top"]');

    let publishedDateSpan = document.getElementById("WMHPublishedDate");

    if (!publishedDateSpan) {
        publishedDateSpan = document.createElement("span")
        publishedDateSpan.id = "WMHPublishedDate";
        editDateTag.after(publishedDateSpan);
    } else {
        publishedDateSpan.replaceChildren();
    }

    return publishedDateSpan;
}

function insertReloadButton(str) {
    const appendString = " | Veröffentlicht: ";
    const button = document.createElement("a");

    const publishedDateSpan = getEmptyPlaceholder();

    if (str) {
        publishedDateSpan.replaceChildren(str);
    } else {
        button.textContent = "⟳";
        button.title = "neu laden";
        button.addEventListener('click', location.reload.bind(location));
        button.style = "cursor:pointer;";

        publishedDateSpan.replaceChildren(appendString, button);
    }
}

function getAdJsonData(id) {

    const request = new Request("https://www.willhaben.at/webapi/iad/atverz/" + id + "?formatEnableHtmlTags=true", {
        headers: {
            "Accept": "application/json",
            "X-WH-Client": "api@willhaben.at;responsive_web;server;1.0.0;desktop",
            "Cache-Control": "no-cache"
        }
    });
    return fetch(request)
        .then((response) => {
            return response.json();
        }).then((jsonData) => {
            return { "advertDetails" : jsonData };
        })
        .catch((e) => {
            console.error("[willmehrhaben] failed to fetch ad JSON data for ad " + id);
            return null;
        });
}

function getListJsonData() {
    const path = window.location.pathname.replace("/iad/", "") + window.location.search;

    const request = new Request("https://www.willhaben.at/webapi/iad/search/atz/seo/" + path, {
        headers: {
            "Accept": "application/json",
            "X-WH-Client": "api@willhaben.at;responsive_web;server;1.0.0;desktop",
            "Cache-Control": "no-cache"
        }
    });
    return fetch(request)
        .then((response) => {
            return response.json();
        }).then((jsonData) => {
            return { "searchResult" : jsonData };
        })
        .catch((e) => {
            console.error("[willmehrhaben] failed to fetch ad JSON data");
            return null;
        });
}

function getPageProps() {

    if (NEXT_DATA === null) {
        // if NEXT_DATA is null, the data from the __NEXT_DATA__ tag is probably current
        // need to switch to using the JSON API
        const dataTag = document.getElementById("__NEXT_DATA__");
        if (!dataTag) {
            console.warn("[willmehrhaben] could not find NEXT_DATA tag");
            return new Promise((resolve, reject) => reject(null));
        } else {

            const data = JSON.parse(dataTag.textContent);

            const pageProps = data["props"]["pageProps"]

            NEXT_DATA = pageProps;

            return new Promise((resolve, reject) => resolve(pageProps));
        }
    }

    // We already have data from the NEXT_DATA tag, need to check if it is current
    const isAdPageResult = isAdPage();

    if (isAdPageResult["single"]) {
        const urlId = getIdFromUrl();
        if (typeof NEXT_DATA["advertDetails"] !== 'undefined') {
            // the data from NEXT_DATA is current, we can use it
            if (NEXT_DATA["advertDetails"]["id"] ==  urlId) {
                return new Promise((resolve, reject) => resolve(NEXT_DATA));
            }
        }
        console.debug("[willmehrhaben] getting upstream JSON data");
        return getAdJsonData(urlId);
    } else if (isAdPageResult["list"]) {
        if (NEXT_DATA !== "") {
            return new Promise((resolve, reject) => resolve(NEXT_DATA));
        } else {
            console.debug("[willmehrhaben] getting upstream JSON data");
            return getListJsonData();
        }
    }
}

function reformatDate(dateString) {
    return dateString.slice(8,10) + "." + dateString.slice(5,7) + "." + dateString.slice(0,4) + ", " + dateString.slice(11,13) + ":" + dateString.slice(14,16) + " Uhr";
}

function injectPublishedDate() {

    console.debug("[willmehrhaben] injecting date...");

    getPageProps().then((pageProps) => {

        let appendString = "";
        if (!pageProps["advertDetails"]) {
            console.warn("[willmehrhaben] could not find 'advertDetails' property");
            insertReloadButton();
        } else {
            if (getIdFromUrl() === pageProps["advertDetails"]["id"]) {
                const firstPublished = pageProps["advertDetails"]["firstPublishedDate"];
                appendString = " | Veröffentlicht: " + reformatDate(firstPublished);
                insertReloadButton(appendString);
            } else {
                console.warn("[willmehrhaben] JSON data ID (" + pageProps["advertDetails"]["id"] + ") does not match the id from the URL");
                insertReloadButton();
            }
        }
        console.debug("[willmehrhaben] done");
    });

}

function getAttribute(item, attributeName) {
    for (let i = 0; i < item["attributes"]["attribute"].length; i++) {
        const attr = item["attributes"]["attribute"][i];
        if (attr["name"] === attributeName) {
            let result;
            if (attr["values"].length == 1) {
                result = attr["values"][0];
            } else {
                result =  attr["values"];
            }
            return result;
        }
    }
    return null;
}

function listPageInsertPubDate() {
    console.debug("[willmehrhaben] injecting dates in list items...");

    getPageProps().then((pageProps) => {

        const htmlTag = document.documentElement;
        const scrollY = window.scrollY;
        htmlTag.scroll({"left":0, "top":0.5*document.body.offsetHeight, "behavior": "smooth"});
        setTimeout(() => htmlTag.scroll({"left":0, "top":document.body.offsetHeight, "behavior": "smooth"}), 200);

        const adList = pageProps["searchResult"]["advertSummaryList"]["advertSummary"];

        setTimeout(() => {
            adList.forEach((item) => {

                const willhabenId = item["id"];
                const itemATag = document.getElementById("search-result-entry-header-" + willhabenId);

                if (itemATag === null) {
                    console.debug("[willmehrhaben] Failed to find item's a tag");
                    return;
                }

                // clear existing items
                dateTags = itemATag.getElementsByClassName("wmh_list_item_date");
                for (let i = 0; i < dateTags.length; i++) {
                    dateTags.item(i).remove();
                }

                const dateDiv = document.createElement("div");
                dateDiv.className = "wmh_list_item_date";
                dateDiv.textContent = "Geändert: " + reformatDate(getAttribute(item, "PUBLISHED_String"));

                itemATag.appendChild(dateDiv);

                // tag bumped items
                const h3Tag = itemATag.getElementsByTagName("h3")[0];
                if (getAttribute(item, "IS_BUMPED") !== null) {
                    h3Tag.style.color = "#aaa";
                } else {
                    h3Tag.style.fontWeight = "bold";
                }
            });

            injectToggleOldButton();
            document.getElementById("wmh_inject_button").remove();

        }, 1000);
        setTimeout(() => htmlTag.scroll(0, scrollY), 1000);
    })
}

function toggleOldElements() {

    showOld = !showOld;

    const button = document.getElementById("wmh_toggle_old_button");

    if (showOld) {
        button.textContent = hide_old_text;
    } else {
        button.textContent = show_old_text;
    }

    getPageProps().then((pageProps) => {

        const adList = pageProps["searchResult"]["advertSummaryList"]["advertSummary"];

        adList.forEach((item) => {

            const willhabenId = item["id"];
            const itemATag = document.getElementById("search-result-entry-header-" + willhabenId);

            if (itemATag === null) {
                console.debug("[willmehrhaben] Failed to find item's a tag");
                return;
            }

            // remove bumped items
            if (getAttribute(item, "IS_BUMPED") !== null) {
                if (showOld) {
                    itemATag.parentNode.parentNode.classList.remove("wmh_hidden");
                } else {
                    itemATag.parentNode.parentNode.classList.add("wmh_hidden");
                }
            }
        });
    });
}

function removeAds() {
    let i = 1;
    document.getElementById("apn-large-leaderboard").parentNode.parentNode.parentNode.classList.add("wmh_hidden");
    document.querySelector('[data-testid="top-ads-large"]').classList.add("wmh_hidden");
    while(true) {
        const ad = document.getElementById("apn-large-result-list-" + i);
        if (ad === null) return;
        ad.classList.add("wmh_hidden");
        i += 1;
    }
}

function injectButton() {
    const list = document.getElementById("skip-to-resultlist");
    if (list === null) return;
    if (document.getElementById("wmh_inject_button") !== null) return;

    const button = document.createElement("span");
    button.textContent = "Daten einfügen";
    button.addEventListener("click", listPageInsertPubDate);
    button.className = "wmh_list_button";

    const buttonPlaceholder = document.createElement("div");
    buttonPlaceholder.className = "wmh_list_button_placeholder";
    buttonPlaceholder.id = "wmh_inject_button";

    buttonPlaceholder.append(button);

    list.prepend(buttonPlaceholder);
}

function injectToggleOldButton() {
    const list = document.getElementById("skip-to-resultlist");
    if (list === null) return;
    if (document.getElementById("wmh_hide_button") !== null) return;

    const button = document.createElement("span");
    button.textContent = hide_old_text;
    button.addEventListener("click", toggleOldElements);
    button.className = "wmh_list_button";
    button.id = "wmh_toggle_old_button";

    const buttonPlaceholder = document.createElement("div");
    buttonPlaceholder.className = "wmh_list_button_placeholder";
    buttonPlaceholder.id = "wmh_hide_button";

    buttonPlaceholder.append(button);

    list.prepend(buttonPlaceholder);
}

const attrObserver = new MutationObserver((mutations) => {
  mutations.forEach(mu => {
    if (mu.type !== "attributes" && !(mu.attributeName === "class" && mu.attributeName === "data-lt-installed")) return;
    console.debug ("[willmehrhaben] mutation of html tag");
    const isAdPageResult = isAdPage();
    if (!isAdPageResult["result"]) {
        console.debug("not an ad page: " + isAdPageResult["url"]);
        return;
    }
    console.debug("[willmehrhaben] on an ad page");
    setTimeout( () => {
        if ((mu.attributeName === "class" && mu.target.className === " ") || (mu.attributeName === "data-lt-installed" && mu.target.attributes["data-lt-installed"].value === "true")) {
            console.debug("[willmehrhaben] html has finished loading (" + mu.attributeName + ")");
            if (isAdPageResult["single"]) {
                injectPublishedDate();
            }
            if (isAdPageResult["list"]) {
                const toRemove = ["wmh_hide_button", "wmh_inject_button"]
                toRemove.forEach(tryRemove);

                injectButton();
                removeAds();
            }
        } else if (mu.attributeName === "class" && mu.target.className === "nprogress-busy") {
            console.debug("[willmehrhaben] navigating to another page, clearing NEXT_DATA");
            NEXT_DATA = "";
        } else {
            console.debug("[willmehrhaben] html is still loading");
        };
    }, 100);
  });
});

checkRealEstate().then((res) => {
    if (res) {
        const htmlTag = document.documentElement;
        console.debug("[willmehrhaben] attaching mutation observer");
        attrObserver.observe(htmlTag, {attributes: true});

        const isAdPageResult = isAdPage();
        if (isAdPageResult["single"] && isAdPageResult["installed"]) {
            console.debug("[willmehrhaben] data already installed, injecting date");
            injectPublishedDate();
        } else {
            console.debug("[willmehrhaben] not an ad page or data not installed");
        }

        if (isAdPageResult["list"]) {
            injectButton();
            removeAds();
        }
    } else {
        console.debug("[willmehrhaben] not on an ad page");
    }
})
