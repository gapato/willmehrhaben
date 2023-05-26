function isAdPage() {
    const url = window.location.toString();
    return { "result" : url.includes("/d/"), "url": url };
}

function insertReloadButton(editDateTag) {
    const appendString = " | Veröffentlicht: ";
    const button = document.createElement("a");

    button.textContent = "⟳";
    button.title = "neu laden";
    button.addEventListener('click', location.reload.bind(location));
    button.style = "cursor:pointer;";

    editDateTag.textContent = editDateTag.textContent + appendString;
    editDateTag.appendChild(button);
}

function injectPublishedDate() {
    if (!((isAdPage())["result"])) {return;}

    console.debug("[willmehrhaben] injecting date...");

    const dataTag = document.getElementById("__NEXT_DATA__");

    let appendString = "";

    const editDateTag = document.querySelector('[data-testid="ad-detail-ad-edit-date-top"]'); 

    if (!dataTag) {
        console.warn("[willmehrhaben] could not find NEXT_DATA tag");
        appendString = " ⚠ ";
    } else {

        const data = JSON.parse(dataTag.textContent);

        const pageProps = data["props"]["pageProps"]

        if (!pageProps["advertDetails"]) {
            console.warn("[willmehrhaben] could not find 'advertDetails' property");
            insertReloadButton(editDateTag);
        }

        const firstPublished = pageProps["advertDetails"]["firstPublishedDate"];


        const formattedPublishedDate = firstPublished.slice(8,10) + "." + firstPublished.slice(5,7) + "." + firstPublished.slice(0,4) + ", " + firstPublished.slice(11,13) + ":" + firstPublished.slice(14,16) + " Uhr";
        appendString = " | Veröffentlicht: " + formattedPublishedDate;
    }
    editDateTag.textContent = editDateTag.textContent + appendString;

    console.debug("[willmehrhaben] done");
}

const attrObserver = new MutationObserver((mutations) => {
  mutations.forEach(mu => {
    if (mu.type !== "attributes" && mu.attributeName !== "class") return;
    console.debug ("[willmehrhaben] mutation of html class!");
    const iP = isAdPage();
    if (!iP["result"]) { 
        console.debug("not an ad page: " + iP["url"]);
        return; 
    }
    console.debug("[willmehrhaben] on an ad page html class!");
    if (mu.target.className == " ") {
        console.debug("[willmehrhaben] html has finished loading");
        injectPublishedDate()
    } else {
        console.debug("[willmehrhaben] html is still loading");
    };
  });
});

const htmlTag = document.documentElement;
attrObserver.observe(htmlTag, {attributes: true});

injectPublishedDate();
