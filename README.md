# EDRM Mail and Mail Templates mangement module

## Table of Contents
- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Routes](#routes)


## Description
This module is an email and email template module. It provides all the implementation to create email templates, email messages and send it through a configured SMTP. 

## Features
- Manage Email Templates
- Manage Emails
- Send Emails

## Installation

   ```bash
   npm install edrm-mailer
   ```

## Environment Variables
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- EMAIL_USER
- EMAIL_PASS
- SMTP_REJECT_UNAUTHORIZED


## Routes
- /mailTemplate (Default Rest CRUD) : Manage mail templates
- /mail (Default Rest CRUD) : Manage mail messages (by default it's stored in DB when created as draft but not sent)
- /mail/:id/send : Send a message using SMTP server configured

