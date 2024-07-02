# devlog

Notes taken during development, newest to oldest. 

## TODO:
- [ ] Data transformation (see 2024-06-22 entry below)
- [ ] Recipes as files are hard to browse and would become unwieldy at some point
- [ ] Need a way to skip values (like my name) and replace values (like names that should point elsewhere) during processing
- [ ] Need a way to delete and replace content on subsequent processing runs
- [ ] Need better reporting/logging and control over when an error is thrown versus no output

## [[2024-07-01]]

Jumping back in off a short break. I'm very close to this being a working prototype and want to be mindful about what remains and move the rest to the list above. I need to get the daily output working then the file output. The column transformations and everything else (that I know of now) are not required for the PoC.

Iterating through the results and building the daily note for each result means that each event will require reading and writing files, even if there are multiple events for a day. Performance-wise this sucks but it also makes the "delete previous run" logic also delete the previous written event. This also means if the process completes that we'll have incomplete events written to the day. 

The date field that's used to determine what note to write to needs to be a composite of two potential fields for this use case (see entry below). This is an actual problem because we'll be missing events if this isn't solved.

## [[2024-06-22]]

Lots of progress but not a lot of notes. I've figured out a number of the challenges that came up and the system is working well. There are still a few catch points, besides the `TODO`s that I've been adding. Big ones right now:

- Transforming the data before processing needs a lot more flexibility than it has right now. I need to be able to convert a column from one type to another but I don't want to expose too much of that process by requiring DB column types in the recipe. I want it to do a lot of this on it's own without explicit direction but I don't know how far I can get doing that. Converting to/from arrays is probably going to be the most problematic. I don't think this is going to be a show stopper but it definitely needs more thought.
- Somewhat related ... if a column does not have a value, there's no way to currently express "add if not exists" or something similar. This is a problem with Google Calendar data because there is a field `start.date` that's there sometimes (all day events) but should be filled in with another field, `start.dateTime` (with modifications) if not. This might just be as simple as some new property or transformation function that says what needs to be done. Again, I don't think this is a huge problem, just a current limitation.

## [[2024-06-16]]

Trying to figure out how to link two tables together ... there are a few layers of types to deal with:

- The types of the link from and link to fields. There are only certain combinations that can be linked automatically:
	- Intersection (value in one list appears in the other list)
	- Equality (columns are the same type)
	- Inclusion (value in one column appears in a list)
- The types of the link to columns. These will be aggregated based on the join, which has to happen in the query. Just realized that we're aggregating these together into a list so we don't have to be type-aware in the query.


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
