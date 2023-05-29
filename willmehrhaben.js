function isAdPage() {
    const url = window.location.toString();
    return { "result" : url.includes("/d/"), "url": url };
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

function injectPublishedDate() {
    if (!((isAdPage())["result"])) {return;}

    console.debug("[willmehrhaben] injecting date...");

    const dataTag = document.getElementById("__NEXT_DATA__");

    let appendString = "";

    if (!dataTag) {
        console.warn("[willmehrhaben] could not find NEXT_DATA tag");
        appendString = " ⚠ ";
    } else {

        const data = JSON.parse(dataTag.textContent);

        const pageProps = data["props"]["pageProps"]

        if (!pageProps["advertDetails"]) {
            console.warn("[willmehrhaben] could not find 'advertDetails' property");
            insertReloadButton();
        } else {
            if (checkUrlId(pageProps["advertDetails"]["id"])) {
                const firstPublished = pageProps["advertDetails"]["firstPublishedDate"];
                const formattedPublishedDate = firstPublished.slice(8,10) + "." + firstPublished.slice(5,7) + "." + firstPublished.slice(0,4) + ", " + firstPublished.slice(11,13) + ":" + firstPublished.slice(14,16) + " Uhr";
                appendString = " | Veröffentlicht: " + formattedPublishedDate;
                insertReloadButton(appendString);
            } else {
                console.warn("[willmehrhaben] JSON data ID (" + pageProps["advertDetails"]["id"] + ") does not match the id from the URL");
                insertReloadButton();
            }
        }
    }

    console.debug("[willmehrhaben] done");
}

const attrObserver = new MutationObserver((mutations) => {
  mutations.forEach(mu => {
    if (mu.type !== "attributes" && !(mu.attributeName === "class" && mu.attributeName === "data-lt-installed")) return;
    console.debug ("[willmehrhaben] mutation of html tag");
    const iP = isAdPage();
    if (!iP["result"]) {
        console.debug("not an ad page: " + iP["url"]);
        return;
    }
    console.debug("[willmehrhaben] on an ad page");
    if ((mu.attributeName === "class" && mu.target.className === " ") || (mu.attributeName === "data-lt-installed" && mu.target.attributes["data-lt-installed"].value === "true")) {
        console.debug("[willmehrhaben] html has finished loading (" + mu.attributeName + ")");
        injectPublishedDate()
    } else {
        console.debug("[willmehrhaben] html is still loading");
    };
  });
});

const htmlTag = document.documentElement;
attrObserver.observe(htmlTag, {attributes: true});
