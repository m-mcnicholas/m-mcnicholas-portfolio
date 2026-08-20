const names = ["One", "Two", "Three", "Four", "Five", "Six"];

export async function installProjectFixtures(page, count = 6) {
  await page.route("**/test-project.html", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Test project</title><h1>Test Project</h1>"
    });
  });

  await page.route("**/", async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    const records = names.slice(0, count).map((name, index) => `
        <article class="project-record" data-kind="project" data-color="#${["355c51", "3f526d", "75434a", "644b76", "6d5835", "315765"][index]}" data-accent="#e5cc83">
          <p class="record-type">Automated test fixture</p>
          <h2>Test Project ${name}</h2>
          <time datetime="2026-0${6 - index}-01">${["June", "May", "April", "March", "February", "January"][index]} 1, 2026</time>
          <p class="record-summary">Verify project record ${index + 1} across each portfolio presentation.</p>
          <p class="record-details">This project exists only in the automated browser response.</p>
          <a href="test-project.html#project-${index + 1}">Open test project ${index + 1}</a>
        </article>`).join("");
    html = html.replace('<p class="empty-archive">No projects have been added yet.</p>', records);
    await route.fulfill({ response, body: html });
  });
}
