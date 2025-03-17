---
layout: post
title: Fast Static Jekyll Blog Deployment with Azure CI/CD
date: 2022-02-04
categories: ["jekyll", "azure devops"]
---

# Introduction

A few days prior, when I set this blog up, I wanted to shortcut a lot of the legwork with setting up a proper CI/CD pipeline to build and release out to an Azure Static Web App.

If you're a fan of horror stories feel free to read my [initial attempt here](https://jamesgould.dev/posts/sinning-via-azure-devops/).

Some future requirements have come up which meant that I not only needed a proper *build* pipeline, but also a fast one.

For those unaware, Azure Devops has a free tier which includes 1800 minutes of build time per month, refreshing on the 1st of the month.

I've now built a true, fairly fast CI/CD pipeline to build and release this blog out and I'd like to share my findings with you, dear reader.

In case you just want the `YAML` and nothing else, here it is:

```yaml
trigger:
- master

pool:
  vmImage: 'ubuntu-latest'

schedules:
- cron: "5 0 * * *"
  displayName: Daily release for scheduled posts
  branches:
    include: 
     - master
  always: true 

steps:
- task: UseRubyVersion@0
  inputs:
    versionSpec: '>= 2.5'

- script: |
    gem install jekyll bundler --no-rdoc
    bundle install --retry=3 --jobs=4
  displayName: 'bundle install'

- task: CmdLine@2
  inputs:
    script: bundle exec jekyll build
    displayName: 'Jekyll Build'
    
- task: AzureStaticWebApp@0
  inputs:
      app_location: '/_site'
      api_location: 'api'
      output_location: '/_site'
      azure_static_web_apps_api_token: $(deployment_token)

```

# Let's break it down

Let's jump into the nitty-gritty of what this build config is doing, and why.

```yaml
schedules:
- cron: "5 0 * * *"
  displayName: Daily release for scheduled posts
  branches:
    include: 
     - master
  always: true 
```

This is an optional include that will build the blog on a schedule, with the cron being every day at 00:05am. This is so I can schedule posts into the `all_collections/_posts` directory and have them release on the date of the post. 

If you don't want to schedule a build and simply want to trigger the release when you publish a new post, delete this section.

```yaml
steps:
- task: UseRubyVersion@0
  inputs:
    versionSpec: '>= 2.5'

- script: |
    gem install jekyll bundler --no-rdoc
    bundle install --retry=3 --jobs=4
  displayName: 'bundle install'
```

This is a 2 step part which has been the majority of the time sink I've experienced.

First we're specifying which version of `Ruby` to use, as [Jekyll advises against using spec 3.0 or higher in their quickstart guide.](https://jekyllrb.com/docs/)

Next we're pipelining two scripts to set the stage for our blog:

- `gem install jekyll bundler --no-rdoc` which will allow the actual build script used by `Jekyll` to run correctly.
- `bundle install --retry=3 --jobs=4` which will then install our dependencies etc, ready for compiling the blog markdown into HTML.

Let's take a deeper look into each.

# Lightening fast?

`gem install jekyll bundler --no-rdoc` comprises of two parts, the command to run and the parameters. 

The initital command `gem install jekyll bundler` typically takes around 2m30s to run on the Azure Free tier. Part of this, for whatever reason, is building documentation for the script which we, as "set-and-forget" pipeline runners, don't care about. That's where `--no-rdoc` comes in.

With this addition we skip the step where the documentation is created. This shaved around 30s off the total build time, saving our precious free minutes!

`bundle install --retry=3 --jobs=4` is an important part of the process as building the Jekyll site requires the bundle to be installed. Some caching can be done here to mitigate further time, but I haven't gotten to that yet.

The `--job=4` is the key part here. Without it, we run the process on a single core. By specifying `4` we're able to run our command on 4 cores, shaving off a bunch of time. I didn't really notice this before, but I took it out for a trial run and it added an extra couple of minutes to the build time.

# The boring stuff

```yaml
- task: CmdLine@2
  inputs:
    script: bundle exec jekyll build
    displayName: 'Jekyll Build'
```

Now that we've gotten our ducks firmly in a row it's time to build out `xxx.md` files into actual HTML. This is a simple command-line script which runs `bundle exec jekyll build`. Only takes about 1s, no point trying to optimise it.

```yaml
- task: AzureStaticWebApp@0
  inputs:
      app_location: '/_site'
      api_location: 'api'
      output_location: '/_site'
      azure_static_web_apps_api_token: $(deployment_token)
```

At this point we've done all the required steps and we're ready to publish out to our Azure Static Web App. We have a `pipeline variable` set called `deployment_token` which you can grab from the configuration blade of your Static Web App (detailed explanation on the previous post linked above).

This step takes the ready `_site` directory and publishes it out.

## Aaaaand breathe.

Cool, we're all set. It's running, total time is typically just over 3 minutes which means we can run a whole bunch of these each day at `00:05` without stressing.