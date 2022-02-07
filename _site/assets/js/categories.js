const categories = { jekyll: [{ url: `/posts/fast-deployment/`, date: `04 Feb 2022`, title: `Fast Jekyll Blog Deployment with Azure CI/CD`},{ url: `/posts/scuffed-publish/`, date: `28 Jan 2022`, title: `Publishing Jekyll Blog via Azure Devops`},],azure devops: [{ url: `/posts/fast-deployment/`, date: `04 Feb 2022`, title: `Fast Jekyll Blog Deployment with Azure CI/CD`},{ url: `/posts/scuffed-publish/`, date: `28 Jan 2022`, title: `Publishing Jekyll Blog via Azure Devops`},], }

window.onload = function () {
  document.querySelectorAll(".category").forEach((category) => {
    category.addEventListener("click", function (e) {
      const posts = categories[e.target.innerText];
      let html = ``
      posts.forEach(post=>{
        html += `
        <a class="modal-article" href="${post.url}">
          <h4>${post.title}</h4>
          <small class="modal-article-date">${post.date}</small>
        </a>
        `
      })
      document.querySelector("#category-modal-title").innerText = e.target.innerText;
      document.querySelector("#category-modal-content").innerHTML = html;
      document.querySelector("#category-modal-bg").classList.toggle("open");
      document.querySelector("#category-modal").classList.toggle("open");
    });
  });

  document.querySelector("#category-modal-bg").addEventListener("click", function(){
    document.querySelector("#category-modal-title").innerText = "";
    document.querySelector("#category-modal-content").innerHTML = "";
    document.querySelector("#category-modal-bg").classList.toggle("open");
    document.querySelector("#category-modal").classList.toggle("open");
  })
};