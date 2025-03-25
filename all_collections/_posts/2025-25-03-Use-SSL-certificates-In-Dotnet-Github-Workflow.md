---
layout: post
title: Use SSL Certificates in a .NET GitHub Workflow
date: 2025-03-17
categories: ["csharp", "dotnet", "github"]
---

I recently began working on the new implementation of the [Azure Keyvault Emulator](https://github.com/james-gould/azure-keyvault-emulator) and created a heap of integration tests.

As part of my build and release process I wanted to run something akin to:

```
dotnet test --verbosity minimal
```

but due to the tests *requiring* SSL connections my tests were failing with:

```csharp
   System.Net.Http.HttpRequestException : The SSL connection could not be established, see inner exception.
---- System.Security.Authentication.AuthenticationException : The remote certificate is invalid because of errors in the certificate chain: UntrustedRoot
```

I tried a few solutions, including asking ChatGPT who dumped out a *load* of completely unworking code, but the following Just Worked™:

```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '9.0.x'

      - name: Install SSL Certificates
        run: |
          dotnet dev-certs https --trust

      - name: Run Integration Tests
        run: |
          dotnet test --verbosity minimal
```

Super simple, you just need to:

- Set up the .NET action `uses: actions/setup-dotnet@v3`
- Use the `dev-certs` CLI tool to create and trust an SSL cert: `dotnet dev-certs https --trust`
- Then run your tests `dotnet test --verbosity minimal`