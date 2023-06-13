function isAdPage() {
    const url = window.location.toString();
    const single = url.includes("/d/");
    const list = (document.getElementById("skip-to-resultlist") !== null);
    const dataInstalled = typeof document.documentElement["attributes"]["data-lt-installed"] !== 'undefined';
    return { "single": single, "list": list, "url": url, "installed": dataInstalled, "result": single || list };
}

function checkUrlId(willhabenId) {
    const url = window.location.toString();
    const v = url.split("-");
    const idFromUrl = v[v.length-1].split("/")[0];
    if (idFromUrl === willhabenId) {
        return true;
    } else {
        console.warn("[willmehrhaben] JSON data ID (" + willhabenId + ") does not match the id from the URL (" + idFromUrl + ")");
        return false;
    }
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

function getPageProps() {
    const dataTag = document.getElementById("__NEXT_DATA__");

    if (!dataTag) {
        console.warn("[willmehrhaben] could not find NEXT_DATA tag");
        return null;
    } else {

        const data = JSON.parse(dataTag.textContent);

        const pageProps = data["props"]["pageProps"]

        return pageProps;
    }
}

function reformatDate(dateString) {
    return dateString.slice(8,10) + "." + dateString.slice(5,7) + "." + dateString.slice(0,4) + ", " + dateString.slice(11,13) + ":" + dateString.slice(14,16) + " Uhr";
}

function injectPublishedDate() {

    console.debug("[willmehrhaben] injecting date...");

    const pageProps = getPageProps();

    let appendString = "";

    if (pageProps === null || typeof pageProps === 'undefined') {
        appendString = " ⚠ ";
    } else {
        if (!pageProps["advertDetails"]) {
            console.warn("[willmehrhaben] could not find 'advertDetails' property");
            insertReloadButton();
        } else {
            if (checkUrlId(pageProps["advertDetails"]["id"])) {
                const firstPublished = pageProps["advertDetails"]["firstPublishedDate"];
                appendString = " | Veröffentlicht: " + reformatDate(firstPublished);
                insertReloadButton(appendString);
            } else {
                console.warn("[willmehrhaben] JSON data ID (" + pageProps["advertDetails"]["id"] + ") does not match the id from the URL");
                insertReloadButton();
            }
        }
    }

    console.debug("[willmehrhaben] done");

    if (pageProps === null || typeof pageProps === 'undefined') {
    }
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

    const pageProps = getPageProps();

    if (pageProps === null || typeof pageProps === 'undefined') {
    } else {
        const htmlTag = document.documentElement;
        const scrollY = window.scrollY;
        htmlTag.scroll({"left":0, "top":2*htmlTag.getClientRects()[0]["height"], "behavior": "smooth"});

        const adList = pageProps["searchResult"]["advertSummaryList"]["advertSummary"];

        setTimeout(() => {
            adList.forEach((item) => {


                const willhabenId = item["id"];
                const itemATag = document.getElementById("search-result-entry-header-" + willhabenId);

                if (itemATag === null) {
                    console.debug("[willmehrhaben] Failed to find item's a tag");
                    console.debug(document.getElementById(willhabenId));
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

            htmlTag.scroll(0, scrollY);
        }, 1000);
    }
}

function hideOldElements() {
    document.getElementById("wmh_hide_button").remove();
    const pageProps = getPageProps();

    if (pageProps === null || typeof pageProps === 'undefined') {
    } else {
        const adList = pageProps["searchResult"]["advertSummaryList"]["advertSummary"];

        adList.forEach((item) => {

            const willhabenId = item["id"];
            const itemATag = document.getElementById("search-result-entry-header-" + willhabenId);

            if (itemATag === null) {
                console.debug("[willmehrhaben] Failed to find item's a tag");
                console.debug(document.getElementById(willhabenId));
                return;
            }

            // remove bumped items
            if (getAttribute(item, "IS_BUMPED") !== null) {
                itemATag.parentNode.parentNode.remove();
            }
        });
    }
}

function removeAds() {
    let i = 1;
    document.getElementById("apn-large-leaderboard").parentNode.parentNode.parentNode.remove();
    while(true) {
        const ad = document.getElementById("apn-large-result-list-" + i);
        if (ad === null) return;
        console.log(ad);
        ad.remove();
        i += 1;
    }
}

function wrapperInsertPubDate(isAdPageResult) {
    if (isAdPageResult["single"]) {
        injectPublishedDate();
    } else if (isAdPageResult["list"]) {
        listPageInsertPubDate();
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

function injectHideButton() {
    const list = document.getElementById("skip-to-resultlist");
    if (list === null) return;
    if (document.getElementById("wmh_hide_button") !== null) return;

    const button = document.createElement("span");
    button.textContent = "Alte Anzeigen ausblenden";
    button.addEventListener("click", hideOldElements);
    button.className = "wmh_list_button";

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
            wrapperInsertPubDate(isAdPageResult);
        } else {
            console.debug("[willmehrhaben] html is still loading");
        };
    }, 500);
  });
});

const htmlTag = document.documentElement;
attrObserver.observe(htmlTag, {attributes: true});

const isAdPageResult = isAdPage();
if (isAdPageResult["result"] && isAdPageResult["installed"]) {
    console.debug("[willmehrhaben] data already installed, injecting date");
    setTimeout(() => wrapperInsertPubDate(isAdPageResult), 1000);
} else {
    console.debug("[willmehrhaben] not an ad page or data not installed");
}

injectButton();
injectHideButton();
setTimeout(removeAds, 2000);
