# OmnAIView

Welcome to OmnAIView ! Let's get started !

## What is this?

OmnAIView is a modular Open Source frontend application to receive, display, analyse and save time series data from different backends.

The goal of OmnAIView is to create an easy process to get the information you need from the data you have.

## Why do this ?

The most people dont measure something just to see numbers. They measure because they want information about the data.
The process to get this information is hard. Often you need to know how the scientific environment behind your data works. Or need to implement your own algorithmn to analyse the data. Or worse : calculate it yourself.

We want to make this better !

1. OmnAIView does not only display data from our devices. OmnAIView will support different interfaces for devices, so you can display **your** data from **your** device in the software.
2. OmnAIView will support REST API. You can connect **your** analysis to the frontend and analyse data via a button click.
3. OmnAIView will support its own analysis. You dont know how your scientific background works or need a simple mathematical analysis -> it is only one button click away.

## How to Contribute :

We are very happy about contributions. If you want to contribute just follow the steps in the [CONTRIBUTIONS.md](CONTRIBUTION.md) . We will review your contribution as fast as possible.

## How to get the Code Documentation : 

The Code is documented with compodoc [Compodoc](https://compodoc.app/). To see the documentation follow these steps: 

1. Clone the project 
2. Run ``` npm ci ``` in the root directory of the project 
3. Navigate into the angular folder 
4. Run 
``` npm run compodoc:build-and-serve ``` 
in your console 
5. Open the documentation with the link compodoc generates 

## How to run the project

The project currently contains two separat parts: An angular app and an electron app in which the angular app runs.

### General project

1. Create a fork of the repository to your own github account.
2. Clone the forked repository to your local machine:
   ```
   git clone git@github.com:AI-Gruppe/OmnAIView.git
   cd OmnAIView
   ```

## Package Installation

To install the angular and electron packages, you run ```npm run install:all``` in the root directory.

#### Development Mode

If you want to run the angular frontend in development mode, you can do so by running ```npm run start:dev``` in the root folder. 

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

If you want to run the electron application seperately in development mode, you can do so by running ```npm run start:electron```.

#### Building

To build the full project you can do so by running ```npm run build```. 

This will compile the angular frontend and electron project and store the build artifacts of the frontend in the `dist/` directory. By default, the production build optimizes your application for performance and speed. The electron build installer can be found in the `electron/out/make/squirrel.windows/x64/`, the application that can be run without installation `electron\out\OmnAIView-win32-x64`.

#### Technical Information
    
The project was generated using angular v19.1.4.

### Technical Information about Datasources

OmnAIView is using different data sources. Some are started externally from the application, while others are started together with the application.

### OmnAIScope Dataserver

To receive data from locally connected OmnAIScopes, the OmnAIScope Dataserver is integrated into the frontend as an autostart component.
Version : v0.4.0
Github repository: https://github.com/AI-Gruppe/OmnAIScope-DataServer

## Information is missing?

If some information is missing please create an issue in this repository. We will try to answer your question as fast as possible.
