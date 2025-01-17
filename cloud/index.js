'use strict';

const HEADER_KEY = "x-github-event";

const actionWords = {
    "opened": "发起",
    "closed": "关闭",
    "reopened": "重新发起",
    "edited": "更新",
    "merge": "合并",
    "created": "创建",
    "requested": "请求",
    "completed": "完成",
    "synchronize": "同步更新",
    "reordered": "排序"
};

const querystring = require('querystring');
const ChatRobot = require('./chat');
/**
 * 处理ping事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePing(body, robotid) {
    const robot = new ChatRobot(
        robotid
        );
        
    const { repository } = body;
    const msg = "成功收到了来自Github的Ping请求，项目名称：" + repository.name;
    await robot.sendTextMsg(msg);
    return msg;
}

/**
 * 处理push事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePush(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    let msg;
    const { pusher, repository, commits, ref} = body;
    const user_name = pusher.name;
    const lastCommit = commits[0];
    msg = `项目 ${repository.name} 收到了一次push，提交者：${user_name}，最新提交信息：${lastCommit.message}`;
    const mdMsg = `项目 [${repository.name}](${repository.url}) 收到一次push提交
                    提交者:  \<font color= \"commit\"\>${user_name}\</font\>
                    分支:  \<font color= \"commit\"\>${ref}\</font\>
                    最新提交信息: ${lastCommit.message}`;
    await robot.sendMdMsg(mdMsg);
    return mdMsg;
}

/**
 * 处理merge request事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handlePR(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const {action, sender, pull_request, repository} = body;
    const mdMsg = `${sender.login}在 [${repository.full_name}](${repository.html_url}) ${actionWords[action]}了PR
                    标题：${pull_request.title}
                    源分支：${pull_request.head.ref}
                    目标分支：${pull_request.base.ref}
                    [查看PR详情](${pull_request.html_url})`;
    await robot.sendMdMsg(mdMsg);
    return mdMsg;
}

/**
 * 处理issue 事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handleIssue(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const { action, issue, repository } = body;
    if (action !== "opened") {
        return `除非有人开启新的issue，否则无需通知机器人`;
    }
    const mdMsg = `有人在 [${repository.name}](${repository.html_url}) ${actionWords[action]}了一个issue
                    标题：${issue.title}
                    发起人：[${issue.user.login}](${issue.user.html_url})
                    [查看详情](${issue.html_url})`;
    await robot.sendMdMsg(mdMsg);
    return;
}
/**
 * 处理projects_v2_item 事件
 * @param ctx koa context
 * @param robotid 机器人id
 */
async function handleProjectsV2Item(body, robotid) {
    const robot = new ChatRobot(
        robotid
    );
    const { action, sender, organization, projects_v2_item } = body;
    const { creator, content_type } = projects_v2_item;
    if (action !== "opened") {
        return `除非有人开启新的issue，否则无需通知机器人`;
    }
    const mdMsg = `有人在 [${organization.login}](${organization.repos_url}) ${actionWords[action]}了一个issue
                    类型：${content_type}
                    发起人：[${sender.login}](${sender.html_url})
                    project card creator：[${creator.login}](${creator.html_url})
                    `;
    await robot.sendMdMsg(mdMsg);
    return;
}

/**
 * 对于未处理的事件，统一走这里
 * @param ctx koa context
 * @param event 事件名
 */
function handleDefault(body, event) {
    return `Sorry，暂时还没有处理${event}事件`;
}

exports.main_handler = async (event, context, callback) => {
    console.log('event: ', event);
    if (!(event.headers && event.headers[HEADER_KEY])) {
        return 'Not a github webhook deliver'
    }
    const gitEvent = event.headers[HEADER_KEY]
    const robotid = event.queryString.id
    const query = querystring.parse(event.body);
    // console.log('query: ', query);
    const payload = JSON.parse(query.payload);
    console.log('payload: ', payload);    
    console.log('robotid: ', robotid);
    switch (gitEvent) {
        case "push":
            return await handlePush(payload, robotid);
        case "pull_request":
            return await handlePR(payload, robotid);
        case "ping":
            return await handlePing(payload, robotid);
        case "issues":
            return await handleIssue(payload, robotid);
        case "projects_v2_item":
            return await handleProjectsV2Item(payload, robotid);
        default:
            return handleDefault(payload, gitEvent);
    }
};