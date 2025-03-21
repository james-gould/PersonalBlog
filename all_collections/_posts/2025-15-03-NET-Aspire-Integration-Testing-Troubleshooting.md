---
layout: post
title: .NET Aspire Integration Testing Quick Start
date: 2025-03-16
categories: ["dotnet 8", "dotnet Aspire", "integration testing", "csharp"]
---

# Introduction

One of my main gripes with Microsoft is their documentation. If you're starting something from scratch you'll naturally Google around for it, find the docs and the example code looks super simple; then you get into the nitty gritty and suddenly you're riding solo.

I've decided to fork the [Azure KeyVault Emulator](https://github.com/james-gould/azure-keyvault-emulator), which has been archived as of October 2024, because the functionality is really quite desirable. Aspire has allowed us to create local cloud environments at dev-time without needing to actually host or deploy resources, nor configure RBAC access (shudders). Key Vault is one of those services that *doesn't* have support in Aspire (yet?) and you need to have a real instance of it hosted on Azure. With the emulator, and my future development/extensions, this won't be required.

I wanted to create integration tests for the API to ensure it met the acceptance criteria for public consumption - naturally I googled ".NET Aspire Integration Testing" and [this was the first link I saw](https://learn.microsoft.com/en-us/dotnet/aspire/testing/write-your-first-test?pivots=xunit), from Microsoft themselves!

I use XUnit for all my testing purposes (mainly from habit) and .NET Aspire has a handy XUnit template you can just create a project from and now you have integration testing support!

Right? No. Why else would I be writing this?

If you're weird like me you avoid odd number .NET versions. I went from `.NET Core 2.2` to `.NET 6`, now `.NET 8`. I'll be upgrading to `.NET 10` when it comes out too.

This blog post covers setting up integration testing with `.NET 8`. Things may work differently in `.NET 9` - ie something that you need to explicitly delare in `.NET 8` may be implicit in future versions.

# Setting up correctly

We'll be creating a new `.NET Aspire XUnit Project` from Visual Studio:

![.NET Aspire Integration Testing Project using XUnit](https://i.imgur.com/gKXsc5l.png)

Next step is to add a reference to your `AppHost` project in your new `XUnit` project:

![.Net Aspire Integration Testing AppHost Setup](https://i.imgur.com/PWT3Iby.png)

This will allow your new `IntegrationTesting` project to run the `AppHost` project, which in turn creates all the required resources, connection strings and so forth. Really bloody handy.

# Shared/reference projects

One of the nuances of `.NET Aspire` is any projects referenced are classed as `executables` - meaning if you need a `Model` from your API to create an integration test from it cannot exist in the same project as your API.

Annoying, but not a hill worth dying on. I migrated the models out of the `API` project and into a `Shared` project, and referenced it as such:

```xml
<ProjectReference Include="..\AzureKeyVaultEmulator.Shared\AzureKeyVaultEmulator.Shared.csproj" IsAspireProjectResource="false"/>
```

The really key part here is the `IsAspireProjectResource="false"` which allows you to reference items from within that project like you would a normal project reference. For example:

```cs
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

I personally recommend encapsulating any names for applications into a `const string` like above because it allows for cleaner code and reusability. 

...or I'm just lazy and can't be bothered to update 3 strings when I make a change.

# Create your testing environment

Now you're finally ready to create your testing environment! Let's get cracking.

First off we're going to need a `Fixture`, which encapsulates the environment for your actual test cases. This fixture will make use of the reference to your `AppHost`, creating an instance of it per test class, and then using its' exposed endpoints/services to execute tests.

You don't *strictly* need to do this, but you really should. If you're writing more than a single integration test then you'll save a load of time writing/copying the same code per test case, and any faults that crop up can be fixed in a single area.

Again, reusability! It's important - and this is why the MS documentation kind of sucks sometimes.

Create a basic, minimal `Fixture` inside of your `IntegrationTesting` project (ideally in a suitably named folder):

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

Let's go over the important bits here:

- `InitialiseAsync()` creates our `DistrubutedApplication` - ie the `AppHost`. We want to keep a higher scoped reference to that for the future: `_app`.
- `ResourceNotificationService` allows us to `WaitAsync()` for resources that `.NET Aspire` is creating before trying to use them; essentially the testing version of `WaitFor(xxx)`.
- `DisposeAsync()` cleans up the `DistributedApplication` on a per-class basis. Without this you will have lingering resources/ports should your tests throw an `Exception` and bottom out.

We're trying to test an API, so we need a `HttpClient` which points to our `localhost:XXXX` resource. 


Unless we hardcode the `port` we need to look this up. The Microsoft docs tell you to create these on a per-test basis, gah, which is not ideal.

Let's create, and expose, a `HttpClient` from our `Fixture` by extending its' functionality:

```csharp
private HttpClient? _testingClient; // Placed below _notificationService

public async Task<HttpClient> CreateHttpClient(string applicationName = AspireConstants.EmulatorServiceName)
{
    if (_testingClient is not null)
        return _testingClient;

    _testingClient = _app!.CreateHttpClient(applicationName);

    await _notificationService!.WaitForResourceAsync(applicationName, KnownResourceStates.Running).WaitAsync(TimeSpan.FromSeconds(30));

    return _testingClient;
}
```

We're now using the `CreateHttpClient("MyApiProject")` method which under the hood uses `IHttpClientFactory` [as you can see here](https://github.com/dotnet/aspire/blob/main/src/Aspire.Hosting.Testing/DistributedApplicationHostingTestingExtensions.cs#L23-L34). No need to worry about hardcoding the IP and Port for your application, delegate the work to `.NET Aspire`.

Next we're making use of our `ResourceNotificationService` to wait for the API to be alive. This is near-instant once the `AppHost` has launched but extremely useful if you have a slow start-up (such as waiting for a database server).

We're also making use of your `AspireConstants.EmulatorServiceName` here to keep our code clean too! I will keep beating the reusability drum.

# Create your integration test(s)

Okay, finally, we can start writing tests in a way that is easy to maintain.

First off create a new `TestClass` for a particular `Controller`, `Endpoint`, whatever you want to test:

```csharp
public class GetSecretTests(TestingFixture fixture) : IClassFixture<TestingFixture>
{

}
```

The `IClassFixture<TestingFixture>` tells our class that we're a testing class specifically, and exposes the `TestingFixture` to it.

We're using the new [Primary Constructor](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors) syntax - which my eyes/brain still haven't gotten used to. 

Now let's add a test and call into our API:

```csharp
[Fact]
public async Task GetSecretsBlocksRequestWithoutBearerTokenTest()
{
    var client = await fixture.CreateHttpClient();

    var response = await client.GetAsync("secrets/willfail");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
}
```

As you can see the `TestingFixture` allows us to create a bog-standard `HttpClient` which we can use to interact with our API - which has been hosted by `.NET Aspire`.

Remember the point I made about migrating API models to a `Shared` project earlier? If you need to go further into validating the response, ie checking a field has been set correctly, you can do so like you would consuming a 3rd party API:

```csharp
[Fact]
public async Task GetSecretsReturnsBackCorrectValueTest()
{
    var client = await fixture.CreateHttpClient();

    var response = await client.GetAsync("secrets/myPassword");

    var secret = await response.Content.ReadFromJsonAsync<SecretResponse>();

    Assert.NotEqual(string.Empty, secret?.Value);
}
```

And that's it! Now you have a fully reusable `Fixture` and a set up integration testing environment for your API, along with all resources required by your platform to operate.

# Final notes 

If you're using a versioned API and don't want to repeat yourself endlessly (reusabili- okay I'll stop) you can modify the `CreateHttpClient` method in your `Fixture` to do that for you. I'm using the following:

```xml
<PackageReference Include="Asp.Versioning.Http" Version="8.1.0" />
<PackageReference Include="Asp.Versioning.Http.Client" Version="8.1.0" />
```

And implementing them like so:

```csharp
private HttpClient? _testingClient;

public async Task<HttpClient> CreateHttpClient(double version, string applicationName = AspireConstants.EmulatorServiceName)
{
    if (_testingClient is not null)
        return _testingClient;

    var opt = new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(version))
    {
        InnerHandler = new HttpClientHandler() // Make sure you add this!
    };

    var endpoint = _app!.GetEndpoint(applicationName);

    _testingClient = new HttpClient(opt)
    {
        BaseAddress = endpoint
    };

    await _notificationService!.WaitForResourceAsync(applicationName, KnownResourceStates.Running).WaitAsync(TimeSpan.FromSeconds(30));

    return _testingClient;
}
```

And then configure your tests to alter the API version like so:

```csharp
[Theory]
[InlineData(1.0)]
[InlineData(1.1)]
public async Task GetSecretsReturnsBackCorrectValueTest(double version)
{
    var client = await fixture.CreateHttpClient(version); // Included here!

    var response = await client.GetAsync("secrets/myPassword");

    var secret = await response.Content.ReadFromJsonAsync<SecretResponse>();

    Assert.NotEqual(string.Empty, secret?.Value);
}
```

This implementation will append `api-version={version}` to the end ouf our request, where `version` is provided by `[InlineData]`.

You can alter where that version goes, I was going to link the documentation as a tongue-in-cheek joke but in classic Microsoft fashion this happened:

![Documentation missing from MS](https://i.imgur.com/0OeGTiM.png)

Honestly couldn't make it up.

Thanks for reading!