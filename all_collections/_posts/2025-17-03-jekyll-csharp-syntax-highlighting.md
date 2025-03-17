---
layout: post
title: .NET Aspire Integration Testing Quick Start
date: 2025-03-16
categories: ["csharp", "jekyll"]
---

Syntax highlighting is hard but luckily Jekyll makes use of Liquid Tags and Rouge to simplify it for you.

One of the cool things is I can write pure markdown for these blog posts, append a language option to the triple backticks and set the highlighting:

```
    ```csharp
    // Code here
    ```
```

The only issue is that the defaults look terrible:

![default jekyll syntax highlighting for C#](https://i.imgur.com/bGEDMur.png)

So let's fix that.

# Other solutions

I tried a whole heap of solutions to get this working in a nice way, including but not limited to:

- Writing my own Ruby plugin to render differently
- Manually tweaking the `syntax.css` file I use for highlighting
- Installing *blood Rust* to try and make use of [kramdown Tree Sitter](https://tree-sitter.github.io/tree-sitter/)
- Giving up and going to bed.

None of these actually came out looking anything close to what Visual Studio shows you, which is mostly a limitation of the [Rouge CSharp lexer](https://github.com/rouge-ruby/rouge/blob/master/lib/rouge/lexers/csharp.rb).

I don't, and won't, complain about people providing solutions to problems for free in the open source world. I can't thank people *enough* for doing it because the modern internet wouldn't be the same without it.

That said, it didn't work for me. Time to fix it.

# The final solution

I relented and asked ChatGPT what I should do in this situation who presented The Chosen One™:

We're going to be making use of [Prism.js]() instead, which looks significantly better. In a common `.html` file for your blog include the following:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>

<!--language support-->
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
```

Next find a good theme that you like [here](https://github.com/PrismJS/prism-themes?tab=readme-ov-file#available-themes). I personally chose [VS Code Dark](https://github.com/PrismJS/prism-themes/blob/master/themes/prism-vsc-dark-plus.css).

Download that css and place it into a `.css` file inside your `assets/css` folder. Reference the new `css` file in your common file above like so:

```html
<link rel="stylesheet" href="{{site.baseurl}}/assets/css/prismjs-vs.css" />
```

And finally, in a file exclusively used by your `posts`, add this to the bottom of the file **before** the `</html>` tag:

```javascript
  <script>
    document.addEventListener("DOMContentLoaded", function () {
        Prism.highlightAll();
    });
  </script>
```

and there we go! Here's the newly highlighted code above, but looking as close as I could possibly get it to Visual Studio:

```csharp
namespace AzureKeyVaultEmulator.Shared.Constants
{
    public class AspireConstants
    {
        public const string EmulatorServiceName = "keyVaultEmulatorApi";
    }
}

namespace AzureKeyVaultEmulator.IntegrationTests.SetupHelper
{
    public static void ExampleReference()
    {
        var referencedString = AspireConstants.EmulatorServiceName;
    }
}
```

and another example of a method block with various keywords:

```csharp
public sealed class TestingFixture : IAsyncLifetime
{
    private DistributedApplication? _app;
    private ResourceNotificationService? _notificationService;

    public async Task InitializeAsync()
    {
        var builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.AzureKeyVaultEmulator_AppHost>();

        builder.Services.ConfigureHttpClientDefaults(c =>
        {
            c.AddStandardResilienceHandler();
        });

        _app = await builder.BuildAsync();

        _notificationService = _app.Services.GetService<ResourceNotificationService>();

        await _app.StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_app is not null)
            await _app.DisposeAsync().ConfigureAwait(false);
    }
}
```