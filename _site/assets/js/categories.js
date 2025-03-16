const categories = { jekyll: [{ url: `/posts/easy-azure-static-webapp-blog/`, date: `04 Feb 2022`, title: `Fast Static Jekyll Blog Deployment with Azure CI/C`},{ url: `/posts/sinning-via-azure-devops/`, date: `28 Jan 2022`, title: `Publishing Static Web App Blog via Azure Devops (I'm Sinning)`},],azure devops: [{ url: `/posts/easy-azure-static-webapp-blog/`, date: `04 Feb 2022`, title: `Fast Static Jekyll Blog Deployment with Azure CI/C`},{ url: `/posts/sinning-via-azure-devops/`, date: `28 Jan 2022`, title: `Publishing Static Web App Blog via Azure Devops (I'm Sinning)`},],.NET 8: [{ url: `/posts/NET-Aspire-Integration-Testing-Troubleshooting/`, date: `16 Mar 2025`, title: `.NET Aspire Integration Testing Quick Start (and Troubleshooting)`},],.NET Aspire: [{ url: `/posts/NET-Aspire-Integration-Testing-Troubleshooting/`, date: `16 Mar 2025`, title: `.NET Aspire Integration Testing Quick Start (and Troubleshooting)`},],integration testing: [{ url: `/posts/NET-Aspire-Integration-Testing-Troubleshooting/`, date: `16 Mar 2025`, title: `.NET Aspire Integration Testing Quick Start (and Troubleshooting)`},],C#: [{ url: `/posts/NET-Aspire-Integration-Testing-Troubleshooting/`, date: `16 Mar 2025`, title: `.NET Aspire Integration Testing Quick Start (and Troubleshooting)`},], }

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