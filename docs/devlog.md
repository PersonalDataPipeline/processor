# devlog

Notes taken during development, newest to oldest. 

## issues
- Recipes as files are hard to browse and would become unwieldy at some point
- Need better reporting/logging and control over when an error is thrown versus no output

## [[2024-06-14]]

Working through the pipeline actions now. No red flags on this approach so far but getting caught up in the words that I'm using to describe things and feel like I need a step back on that. Not where I need to be spending my time right now, though.

I'm working on getting the pipeline running and getting caught up on a couple of things. 

- I'm definitely seeing the benefit of having a data preparation stage before working with what we've got. The Apple contacts data comes from vCard data which parses out to a bunch of arrays. In many cases, those arrays represent a single value but they get imported by DuckDB as a list, making it hard to work with. I can handle that with the single processor service but I'm trying to decide if it makes sense to run two pipelines, the "prep" one and the "actual" one, or make it work with a single pipeline by allowing transforms to a new column. 
- I'm trying to figure out how to deal with pipeline transformation updates. I'm doing it all with single-row updates for each transformation, which is probably the slowest way to do that but I'm not too worried about performance right now. Problem is that there is no consistent id to run those queries on so I'm potentially transforming multiple values at once multiple times. I feel like there is a way to do this positionally, with the update coming in as a single array of new values but I'm not sure how to do it yet.
- Column types are starting to become problematic with transforms. I want to use DuckDB's duck-typing magic as much as possible and not require users to indicate it in the recipe. I think it's possible but, again, not sure how. 
- The linking is proving difficult, mostly as expected. I think the answer here is to create new columns as though we're joining but I'm not quite sure how to do that yet. 

I'm definitely going to level up (again) on SQL-like statements with this project!


## [[2024-06-13]]

Talking through the design that's kind of coming together in this service. Besides basic recipe validation, processing amounts to:

- Validate input data
	- This is currently just validating that the input name and "sub-name" point to a directory with data in it
	- Seems like there are use cases for both "have no data but processing can still happen" and "have no data but processing should stop." Might need to be indicated in the recipe somehow.
- Validate output handlers
	- Does the handler exist and is it configured properly
	- Validate the data object from the recipe
- Validate the pipeline
	- Check that all fields referenced exist in the input data or were created in the pipeline
	- Check that transformation functions exist
- Load input data from sources into their own tables
	- Fields map to columns
	- Only load the fields we're using

## [[2024-06-12]]

Finished up output validation and the modules for that are looking good. Similar shape as the API modules, typed, fairly straightforward. 

Now moving on to using DuckDB to parse all the data. Seems like a perfect fit for what I'm doing and the [Node.js](https://duckdb.org/docs/api/nodejs/overview) support is a good sign. The Node.js API works a bit differently than the command line and the output is JSON instead of a table. BUT ... it's all working very, very well so far! I can suck in all the JSON files for a certain endpoint in a single line and then select the fields that I want. Lots more to do here but everything is working right out of the box!

Got all the input field juggling working and stored in their own tables, ready to combine. The data types that DuckDB use makes this quite easy, even for nested JSON. The process to read and transform data is very intuitive. In a single statement, I'm:

- Reading in all JSON files
- Parsing specific properties to columns
- De-nesting properties that come in as objects
- Reducing arrays of objects down to arrays of strings
- Creating a table that I can immediately select from



## [[2024-06-10]]

Picking up where I left off now that I have [Google Calendar](https://github.com/PersonalDataPipeline/data-getter/commit/11978568d0b2f9b19c4be16a4e74a7ca4e1688b2) and [Apple Contacts](https://github.com/PersonalDataPipeline/data-getter/commit/f0213de58426341d17db2d4f9e982faab05ab564) data. Walking through the logic in English:

- Validate the recipe's structure
    - Convert YAML to JSON
    - Check against a [Joi](https://joi.dev) schema
- Validate the output strategy
	- Check for required strategy config
	- Check required recipe config
- Read in the input data
    - Read latest daily files in the indicated folder
    - Combine into one big array of entities while filtering out fields
- Run the pipeline

Starting with the basic recipe processing and validation ... I don't want to go too far down this road since the shape is likely to change but I want to show how this is meant to catch problems early.

It occurs to me that the processor will need to understand the input data shape (folders, snapshot vs chronological) so it will need to have access to those modules fairly quickly. Not for the PoC but as a part of the next step.

## [[2024-05-31]]

I'm stuck on how to represent the data processing. I'm not sure if I should start from the UX of the file or from the processing that needs to get done. The more I think about it, the more it feels like the latter is the right starting point. How the transformations are represented is mostly irrelevant as long as it's clear. But the underlying code needs to work a certain way and that should inform the representation. I've been focused on the user-facing part and I think that's a mistake. 

So, let's work on how the transformations can happen, starting with the basic example below. If I were to write code to do that, I would (ignoring potential issues like running out of memory):

**Moved to the next day**

## [[2024-05-30]]

Played around with [DuckDB](https://duckdb.org) for a bit and it's kind of magical! This seems like the thing that should power the processor. 

## [[2024-05-29]]

Working through the recipe processing ... the validation went well, nothing too problematic there. Now I'm writing the logic that will follow the recipe and seeing some obstacles. 

The first is how to handle linking data. Combining one object with another is directional: start with one and add the other or vice versa. But the output depends on a specific "primary" entity. Like with the personal CRM use case, that depends on the date of the event and the contact is secondary data that augments the event. 

First I thought that you should indicate a primary or starting object and then go from there but I think that exposes too much about the inner working of the processor. For this declarative approach to work properly, users should not have to understand the order of ops for the processor. Instead, constructing the recipe should be intuitive. With that in mind, maybe everything should start from the output and build from there?

OK, let me talk through this one bit at a time here. The point of this component is to take raw JSON in an unknown format and convert it into text output of some kind. The most basic task for this system would be to take all entities from a single source and map them to, say, a list in a Markdown file. Using the current recipe format, it would look something like this:

```yaml
inputs:
  google:
    calendar:
      - 'summary'
      - 'start.date'
      - 'start.time'
outputs:
  obsidian:
    - strategy: 'replace_file'
      path: 'Data/All Events'
      template: >
        - ${google.calendar.start.date} at ${google.calendar.start.time} - ${google.calendar.summary}
```

I think this gives us enough to chew on. We need to:
- Pull in all `google/calendar` events and make sure we're encountering the fields we need
- Load the `obsidian` "connector" and check the strategy
- Verify the path
- Build the content using the template

Some problems that come to mind:
- Will this work if we have GB of JSON to work with? Will we run out of memory?
- How do we handle the template string?
- What do we do with the template if the field is not there?

## [[2024-05-28]]

Actually diving into this today after fitting together all the different initial pieces. 

First decision ... how to handle the shape of the recipe. I'm going to go with an old favorite, [Joi](https://joi.dev). This will handle the basic validation for the recipe to make sure processing runs against valid data.


## [[2024-05-22]]

Init! Added all the project foundation files based on the Getter. 
