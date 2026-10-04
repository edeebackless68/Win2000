import {
  el,
  button,
  icon,
  field,
  toolbar,
  statusBar,
  separator,
} from "../ui/index.js";
import { DOCS, downloadFile } from "../core/index.js";
const CONTACTS = DOCS + "/Address Book.json",
  MAIL = DOCS + "/Mail.json";
const read = (ctx, path, initial) => {
  try {
    return JSON.parse(ctx.fs.readFile(path));
  } catch {
    return initial;
  }
};
export function openAddressBook(ctx) {
  const w = ctx.wm.create({
    title: "Address Book - Main Identity",
    icon: "address",
    width: 620,
    height: 405,
    appId: "address",
  });
  let contacts = read(ctx, CONTACTS, []),
    selected = null,
    query = "";
  const body = el("tbody"),
    search = el("input", {
      "aria-label": "Type name or select from list",
      oninput: (e) => {
        query = e.target.value.toLowerCase();
        render();
      },
    });
  const changeContacts = async (update) => {
    await ctx.fs.updateJSON(CONTACTS, (list) => {
      if (!Array.isArray(list))
        throw new Error("The address book has an invalid format.");
      return update(list);
    });
  };
  const edit = (contact = null) => {
    const d = ctx.wm.create({
        title: contact ? "Properties" : "New Contact",
        icon: "address",
        width: 420,
        height: 330,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "contact",
      }),
      name = el("input", {
        value: contact?.name || "",
        "aria-label": "Display name",
      }),
      email = el("input", {
        type: "email",
        value: contact?.email || "",
        "aria-label": "E-mail address",
      }),
      phone = el("input", {
        value: contact?.phone || "",
        "aria-label": "Phone",
      }),
      company = el("input", {
        value: contact?.company || "",
        "aria-label": "Company",
      });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Display name:", name),
        field("E-mail address:", email),
        field("Phone:", phone),
        field("Company:", company),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", async () => {
          if (!name.value.trim()) throw new Error("Enter a display name.");
          const item = {
            id: contact?.id || crypto.randomUUID(),
            name: name.value,
            email: email.value,
            phone: phone.value,
            company: company.value,
          };
          await changeContacts((list) =>
            contact
              ? list.map((c) => (c.id === contact.id ? item : c))
              : [...list, item],
          );
          d.close();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  const remove = async () => {
    if (
      selected &&
      (await ctx.dialogs.confirm("Delete this contact?", "Address Book"))
    ) {
      const id = selected;
      await changeContacts((list) => list.filter((c) => c.id !== id));
    }
  };
  function render() {
    contacts = read(ctx, CONTACTS, []);
    body.replaceChildren(
      ...contacts
        .filter((c) => (c.name + " " + c.email).toLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) =>
          el(
            "tr",
            {
              class: c.id === selected ? "selected" : "",
              onclick: () => {
                selected = c.id;
                render();
              },
              ondblclick: () => edit(c),
            },
            el("td", {}, icon("address"), c.name),
            el("td", { text: c.email }),
            el("td", { text: c.phone }),
          ),
        ),
    );
  }
  w.setMenu({
    File: [
      { label: "New Contact...", shortcut: "Ctrl+N", action: () => edit() },
      {
        label: "Export Contacts...",
        action: () =>
          downloadFile(
            "Address-Book.json",
            JSON.stringify(contacts, null, 2),
            "application/json",
          ),
      },
      { label: "Close", action: () => w.close() },
    ],
    Edit: [
      {
        label: "Properties",
        action: () => edit(contacts.find((c) => c.id === selected)),
      },
      { label: "Delete", action: remove },
    ],
    Tools: [
      {
        label: "Send Mail",
        action: () => {
          const c = contacts.find((c) => c.id === selected);
          if (c) openMail(ctx, { compose: true, to: c.email });
        },
      },
    ],
    Help: [
      {
        label: "About Address Book",
        action: () =>
          ctx.dialogs.message(
            "Address Book\nContacts are saved to My Documents\\Address Book.json.",
            { title: "Address Book", icon: "address" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "address", label: "New", action: () => edit() },
      {
        icon: "settings",
        label: "Properties",
        action: () => edit(contacts.find((c) => c.id === selected)),
      },
      { glyph: "×", label: "Delete", action: remove },
      { separator: true },
      {
        icon: "mail",
        label: "Send Mail",
        action: () => {
          const c = contacts.find((c) => c.id === selected);
          if (c) openMail(ctx, { compose: true, to: c.email });
        },
      },
    ]),
    el(
      "div",
      { class: "address-search" },
      el("label", { text: "Type name or select from list:" }),
      search,
    ),
    el(
      "div",
      { class: "inset fill-scroll" },
      el(
        "table",
        { class: "classic-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            ...["Name", "E-mail Address", "Business Phone"].map((s) =>
              el("th", { text: s }),
            ),
          ),
        ),
        body,
      ),
    ),
    statusBar(contacts.length + " contacts"),
  );
  w.addCleanup(ctx.bus.on("fs:change", render));
  render();
  return w;
}

export function openMail(
  ctx,
  { compose = false, to = "", reply = null, draft: existingDraft = null } = {},
) {
  if (compose) {
    const w = ctx.wm.create({
        title: "New Message",
        icon: "mail",
        width: 650,
        height: 450,
        appId: "compose",
      }),
      toInput = el("input", {
        value: existingDraft?.to || to || reply?.from || "",
        "aria-label": "To",
      }),
      cc = el("input", { value: existingDraft?.cc || "", "aria-label": "Cc" }),
      subject = el("input", {
        value: existingDraft?.subject || (reply ? "Re: " + reply.subject : ""),
        "aria-label": "Subject",
      }),
      body = el("textarea", {
        class: "mail-compose-body",
        "aria-label": "Message body",
        spellcheck: true,
        value: existingDraft?.body || "",
      });
    const id = existingDraft?.id || crypto.randomUUID();
    const fields = () => ({
      to: toInput.value,
      cc: cc.value,
      subject: subject.value,
      body: body.value,
    });
    let baseline = JSON.stringify(
      existingDraft ? fields() : { to: "", cc: "", subject: "", body: "" },
    );
    let storedMessage = existingDraft ? JSON.stringify(existingDraft) : null;
    const dirty = () => JSON.stringify(fields()) !== baseline;
    const draft = () => ({
      id,
      folder: "Drafts",
      ...fields(),
      date: Date.now(),
      from: ctx.settings.get("username"),
    });
    const save = async () => {
      const snapshot = fields(),
        message = { ...draft(), ...snapshot };
      await ctx.fs.updateJSON(MAIL, (mail) => {
        if (!Array.isArray(mail))
          throw new Error("The mail store has an invalid format.");
        const old = mail.find((m) => m.id === id);
        if (storedMessage && JSON.stringify(old) !== storedMessage)
          throw new Error(
            "This draft changed in another window. Reopen it before saving further changes.",
          );
        return old
          ? mail.map((m) => (m.id === id ? message : m))
          : [...mail, message];
      });
      baseline = JSON.stringify(snapshot);
      storedMessage = JSON.stringify(message);
      ctx.bus.emit("mail:change");
      return message;
    };
    const send = async () => {
      if (!toInput.value.trim())
        throw new Error("Enter an e-mail address in the To field.");
      const message = await save();
      const url =
        "mailto:" +
        encodeURIComponent(message.to) +
        "?cc=" +
        encodeURIComponent(message.cc) +
        "&subject=" +
        encodeURIComponent(message.subject) +
        "&body=" +
        encodeURIComponent(message.body);
      location.href = url;
      ctx.dialogs.message(
        "A draft has been saved. Complete sending in your device’s mail application.",
        { title: "Outlook Express", icon: "mail" },
      );
    };
    w.setMenu({
      File: [
        { label: "Save Draft", action: save },
        {
          label: "Export Message...",
          action: () =>
            downloadFile(
              "Message.eml",
              `To: ${toInput.value}\r\nCc: ${cc.value}\r\nSubject: ${subject.value}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body.value}`,
              "message/rfc822",
            ),
        },
        { label: "Close", action: () => w.close() },
      ],
      Edit: [
        { label: "Select All", action: () => body.select() },
        {
          label: "Paste",
          action: async () =>
            body.setRangeText(
              await ctx.clipboard.getText(),
              body.selectionStart,
              body.selectionEnd,
              "end",
            ),
        },
      ],
      Tools: [{ label: "Address Book", action: () => ctx.launch("address") }],
      Help: [
        {
          label: "Sending Mail",
          action: () =>
            ctx.dialogs.message(
              "This browser edition stores drafts locally and hands sending to your device’s mail application. SMTP and POP3 accounts require an external mail service.",
              { title: "Outlook Express Help", icon: "mail" },
            ),
        },
      ],
    });
    w.setContent(
      toolbar([
        { icon: "mail", label: "Send", action: send },
        { icon: "document", label: "Save Draft", action: save },
        {
          icon: "address",
          label: "Addresses",
          action: () => ctx.launch("address"),
        },
      ]),
      el(
        "div",
        { class: "mail-compose-fields" },
        field("To:", toInput),
        field("Cc:", cc),
        field("Subject:", subject),
      ),
      body,
      statusBar("Compose a message"),
    );
    w.onClose = async () => {
      if (!dirty()) return true;
      const a = await ctx.dialogs.message(
        "Do you want to save changes to this message?",
        { title: "Outlook Express", buttons: ["Yes", "No", "Cancel"] },
      );
      if (a === "Yes") {
        await save();
        return !dirty();
      }
      return a === "No";
    };
    w.el.addEventListener("keydown", async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        try {
          await save();
        } catch (error) {
          ctx.dialogs.error(error);
        }
      }
    });
    return w;
  }
  const w = ctx.wm.create({
    title: "Outlook Express",
    icon: "mail",
    width: 790,
    height: 510,
    appId: "outlook",
  });
  let folder = "Inbox",
    selected = null;
  const folders = el("div", { class: "mail-folders inset" }),
    body = el("tbody"),
    preview = el("div", { class: "mail-preview inset" }),
    status = statusBar("", "Working offline");
  const welcome = {
    id: "welcome",
    folder: "Inbox",
    from: "Windows 2000",
    subject: "Welcome to Outlook Express",
    date: Date.now(),
    body: "Welcome to Outlook Express\n\nWrite and save e-mail drafts, manage your address book, and export messages as .eml files.\n\nChoose Send to hand a message to your device’s mail application. This browser desktop does not connect to native SMTP or POP3 servers.\n\nYour drafts and contacts are stored in My Documents.",
  };
  const messages = () => [
    ...read(ctx, MAIL, []),
    ...(ctx.settings.get("mailWelcomeDeleted") ? [] : [welcome]),
  ];
  const render = () => {
    folders.replaceChildren(
      el("div", { class: "tree-title", text: "Folders" }),
      el("div", { class: "mail-local-title" }, icon("folder"), "Local Folders"),
      ...["Inbox", "Outbox", "Sent Items", "Deleted Items", "Drafts"].map((f) =>
        button(
          [
            icon(f === "Inbox" ? "mail" : "folder"),
            f +
              (f === "Inbox"
                ? " (" + messages().filter((m) => m.folder === f).length + ")"
                : ""),
          ],
          () => {
            folder = f;
            selected = null;
            render();
          },
          { class: "tree-item" + (folder === f ? " selected" : "") },
        ),
      ),
    );
    const list = messages().filter((m) => m.folder === folder);
    body.replaceChildren(
      ...list.map((m) =>
        el(
          "tr",
          {
            class: selected === m.id ? "selected" : "",
            onclick: () => {
              selected = m.id;
              render();
            },
            ondblclick: () => {
              if (m.folder === "Drafts")
                openMail(ctx, { compose: true, draft: m });
            },
          },
          el("td", {}, icon("mail"), m.from || m.to),
          el("td", { text: m.subject || "(No subject)" }),
          el("td", { text: new Date(m.date).toLocaleDateString() }),
        ),
      ),
    );
    const message = list.find((m) => m.id === selected) || list[0];
    if (message) {
      selected = message.id;
      preview.replaceChildren(
        el(
          "div",
          { class: "mail-preview-heading" },
          el("div", { text: "From: " + message.from }),
          el("div", { text: "Subject: " + message.subject }),
          el("div", {
            text: "Date: " + new Date(message.date).toLocaleString(),
          }),
        ),
        el("pre", { text: message.body }),
      );
    } else preview.replaceChildren();
    status.children[0].textContent = list.length + " message(s)";
  };
  const deleteMessage = async () => {
    if (selected === "welcome") {
      ctx.settings.set("mailWelcomeDeleted", true);
    } else {
      const id = selected;
      await ctx.fs.updateJSON(MAIL, (mail) =>
        mail.map((m) => (m.id === id ? { ...m, folder: "Deleted Items" } : m)),
      );
    }
    selected = null;
    render();
  };
  w.setMenu({
    File: [
      {
        label: "New",
        submenu: [
          {
            label: "Mail Message",
            action: () => openMail(ctx, { compose: true }),
          },
        ],
      },
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [{ label: "Delete", action: deleteMessage }],
    View: [{ label: "Refresh", action: render }],
    Tools: [
      { label: "Address Book...", action: () => ctx.launch("address") },
      {
        label: "Accounts...",
        action: () =>
          ctx.dialogs.message(
            "This desktop stores local drafts. Sending uses your device’s configured mail application.",
            { title: "Internet Accounts", icon: "mail" },
          ),
      },
    ],
    Message: [
      { label: "New Message", action: () => openMail(ctx, { compose: true }) },
      {
        label: "Reply",
        action: () =>
          openMail(ctx, {
            compose: true,
            reply: messages().find((m) => m.id === selected),
          }),
      },
    ],
    Help: [
      {
        label: "Contents and Index",
        action: () => ctx.launch("help", { topic: "internet" }),
      },
      {
        label: "About Outlook Express",
        action: () =>
          ctx.dialogs.message(
            "Outlook Express\nBrowser recreation\n\nLocal messages, drafts, address book, .eml export, and mail-client handoff.",
            { title: "Outlook Express", icon: "mail" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      {
        icon: "mail",
        label: "New Mail",
        action: () => openMail(ctx, { compose: true }),
      },
      {
        icon: "document",
        label: "Reply",
        action: () =>
          openMail(ctx, {
            compose: true,
            reply: messages().find((m) => m.id === selected),
          }),
      },
      { glyph: "×", label: "Delete", action: deleteMessage },
      { separator: true },
      {
        icon: "address",
        label: "Addresses",
        action: () => ctx.launch("address"),
      },
    ]),
    el(
      "div",
      { class: "mail-layout" },
      folders,
      el(
        "div",
        { class: "mail-main" },
        el(
          "div",
          { class: "mail-list inset" },
          el(
            "table",
            { class: "classic-table" },
            el(
              "thead",
              {},
              el(
                "tr",
                {},
                ...["From", "Subject", "Received"].map((s) =>
                  el("th", { text: s }),
                ),
              ),
            ),
            body,
          ),
        ),
        preview,
      ),
    ),
    status,
  );
  w.addCleanup(ctx.bus.on("mail:change", render));
  w.addCleanup(ctx.bus.on("fs:change", render));
  render();
  return w;
}
