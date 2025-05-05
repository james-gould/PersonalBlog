---
layout: post
title: Introducing the Azure Key Vault Emulator
date: 2025-04-30
categories: ["csharp", "dotnet", "github", "dotnet aspire"]
---

![Azure Key Vault Emulator Introduction Hero](https://jamesgould.dev/assets/images/kve-hero.png){:style="display:block; margin-left:auto; margin-right:auto"}

Developing applications that require secure storage of sensitive data is difficult but it's the perfect use-case for Azure Key Vault. From API keys to entire certificates you can protect your sensitive data from being breached by opting for a battle-tested security product, but it can be a bit of a nightmare to develop an application for locally.

In a dev environment, currently, you need to have a **real** Azure Key Vault resource deployed and potentially being paid for in an active Azure subscription. If you're like me and work for a fairly large company then the security policies around accessing these resources can be tough to navigate, meaning long delays during onboarding and potentially longer delays caused by multiple developers overwriting each other's secure values.

Microsoft have put significant effort into making the cloud development experience easier with .NET and have released emulators for products that face the same issue. The Azure Service Bus now has an official [Emulator](https://learn.microsoft.com/en-us/azure/service-bus-messaging/overview-emulator) to solve that problem for example, sadly Azure Key Vault does not have a similar alternative. 

Or should I say... did not.

*Dramatic pause.*

The first stable release of the [Azure Key Vault Emulator](https://github.com/james-gould/azure-keyvault-emulator) has shipped and is now available for public consumption. Here's a quick rundown of what's available:

- **Full support for the Azure SDK Key Vault Clients**, meaning you can use the official `SecretClient`, `KeyClient` and `CertificateClient` when using the Emulator and simply switch the `VaultURI` in production.
- **Native .NET Aspire support** for both the hosting and client application. Using the Emulator prevents any provisioning of a real Azure Key Vault and doesn't require any configuration to use, it Just Works™. Using `.NET Aspire` is not a requirement for the Emulator.
- **Session or persistent storage of secure data**, meaning you can destroy all secure values when your application is finished running or keep them around if you don't want to run any initialisation code.
- **No new dependencies** because the Emulator is hosted externally to your main application (unless you use the handy `Client` library, more below).

If you use, and like, the Emulator please make sure to ⭐ the repository. This engagement (amongst other criteria) is used to validate project applications for [.NET Foundation membership](https://github.com/dotnet-foundation/projects/issues/441) which will guarantee long term support for the project. Thank you!

## Getting started With the Emulator

The first run of the Emulator will ask if you wish to install a `localhost` SSL certificate - this is unique to your machine and is required for the Azure SDK to work correctly, [click here if you want to learn more or provide your own certificates.](https://github.com/james-gould/azure-keyvault-emulator/blob/development/docs/CONFIG.md#configuring-your-local-system-for-the-emulator)

The Emulator runs as a [container](https://hub.docker.com/r/jamesgoulddev/azure-keyvault-emulator) on your local machine and can be accessed by setting your `VaultUri` to `https://localhost:4997`.

If you're using `.NET Aspire` there's now built-in support for the emulator, meaning you can optionally override your  `IResourceBuilder<AzureKeyVaultResource>` to use the emulator.

First install the [AzureKeyVaultEmulator.Aspire.Hosting](https://www.nuget.org/packages/AzureKeyVaultEmulator.Aspire.Hosting) package (.NET 8 or 9 only):

```
dotnet add package AzureKeyVaultEmulator.Aspire.Hosting
```

Then add to or update your `AppHost` to run the Emulator:

```cs
var keyVaultServiceName = "keyvault";

// With existing resource
var keyVault = builder
    .AddAzureKeyVault(keyVaultServiceName)
    .RunAsEmulator(); // Add this line

// Or directly add the emulator as a resource, no configuration required
var keyVault = builder.AddAzureKeyVaultEmulator(keyVaultServiceName);

var webApi = builder
    .AddProject<Projects.MyApi>("api")
    .WithReference(keyVault); // reference as normal
```

This will inject the environment variable `ConnectionStrings__keyvault`, where `keyvault` is whatever value you assigned to `keyVaultServiceName` above.

When using `.RunAsEmulator()` the resource will no longer attempt to provision in your Azure subscription; the [Aspire team specifically made this change](https://www.reddit.com/r/dotnet/comments/1k7pr7l/comment/mp3ohum/) to support the Azure Key Vault Emulator which blew my mind.

One of the limitations of the Emulator is that it doesn't pass the `ChallengeBasedAuthenticationPolicy` within the Azure SDK without changing your `hosts` file, this is due to the URL of the container not meeting the schema `https://{vault-name}.vault.azure.net/`. 

You need to disable that check like so:

```cs
var vaultUri = new Uri("https:://localhost:4997"); // or get it from your configuration, env vars etc.

var options = new SecretClientOptions
{
    DisableChallengeResourceVerification = true
};

var secretClient = new SecretClient(vaultUri, new DefaultAzureCredential(), options);

var secret = await secretClient.GetSecretAsync("myPassword");
```

To make this even easier the [AzureKeyVaultEmulator.Client](https://www.nuget.org/packages/AzureKeyVaultEmulator.Client) library is also available (netstandard2.0):

```cs
// Injected by Aspire using the name "keyvault".
var vaultUri = builder.Configuration.GetConnectionString("keyvault") ?? string.Empty;

// Basic Secrets only implementation
builder.Services.AddAzureKeyVaultEmulator(vaultUri);
```

You can also optionally inject a `KeyClient` and `CertificateClient` like so:

```cs
// Or configure which clients you need to use
builder.Services.AddAzureKeyVaultEmulator(vaultUri, secrets: true, keys: true, certificates: false);
```

Now you can create your application as normal, using the Azure Key Vault clients you injected at runtime:

```cs
private SecretClient _secretClient;

public SecretsController(SecretClient secretClient)
{
    _secretClient = secretClient;
}

public async Task<string> GetSecretValue(string name)
{
    var secret = await _secretClient.GetSecretAsync(name);

    return secret.Value;
}
```

It's **highly** recommended to check the execution environment at startup to prevent using the Azure Key Vault Emulator in production, which can be done like so:

```cs
var vaultUri = builder.Configuration.GetConnectionString("keyvault") ?? string.Empty;

if(builder.Environment.IsDevelopment())
    builder.Services.AddAzureKeyVaultEmulator(vaultUri, secrets: true, certificates: true, keys: true);
else
    builder.Services.AddAzureClients(client =>
    {
        var asUri = new Uri(vaultUri);

        client.AddSecretClient(asUri);
        client.AddKeyClient(asUri);
        client.AddCertificateClient(asUri);
    });
```

My PR into the main `Aspire.Azure.Security.Client` package which adds support for the `KeyClient` and `CertificateClient` is [almost through peer review](https://github.com/dotnet/aspire/pull/8408) and expected to be in the .NET Aspire 9.3 release - until then you'll need to use the usual Azure SDK For .NET if you need those clients.

## Final remarks

First and foremost I want to thank [Basis Theory](https://github.com/Basis-Theory/azure-keyvault-emulator) for the original repository/codebase of which the Emulator then grew into its' current form. When trying to find a suitable emulator myself I stumbled across it but was sad to see it only supported a few operations and was archived.

Prior to the stable release I got in touch with them to make sure that they were happy with the copyright retention and attribution back, but also to potentially add a redirect link from their archived repository to the now active one. They've been *incredibly* kind and communicative, so thank you to all of the team 💖.

Now, the future.

The Open Source .NET landscape has changed recently with largely adopted packages opting to move towards a commercial license for future updates, with prior releases keeping their OSS license but receiving no further support. 

I fully back developers being paid for their work, and when large companies make money from their free labour it's only fair that they get a piece of the pie too. However this makes introducing new open source dependencies into your workflow a little more risky, or at least more people are now aware of the risk.

That said, Azure Key Vault is not an ever changing product (and by proxy the Emulator); by design the functionality rarely changes to ensure that no security regressions creep in. The Emulator will continue to receive bug fixes, API updates (if available) and general maintenance work but it is *stable* and will not demand 1000s of hours of continued work. It will never be commercialised (I'd be sued into an early grave if I tried anyway) and with the [prospect of .NET Foundation membership on the horizon](https://github.com/dotnet-foundation/projects/issues/441) my own personal bus factor decreases too.

If you make use of the Azure Key Vault Emulator please be sure to ⭐ the [repository](https://github.com/james-gould/azure-keyvault-emulator) as it's one of many metrics that the .NET Foundation uses to validate project membership applications. 

Also number go up = happy ape brain.

Thanks for reading and I hope you enjoy the Emulator!

James